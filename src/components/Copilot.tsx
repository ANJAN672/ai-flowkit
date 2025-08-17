import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, X, Wand2, Zap, Settings } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { copilotService } from '@/lib/services/copilot';
import { openaiService } from '@/lib/services/openai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  workflowGenerated?: boolean;
}

export function Copilot() {
  const { 
    toggleCopilot, 
    copilotSeed, 
    setCopilotSeed,
    currentWorkspaceId,
    currentWorkflowId,
    updateWorkflow,
    workspaces
  } = useAppStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: openaiService.isConfigured() 
        ? 'Hi! I\'m your AI workflow copilot. I can autonomously create complete workflows for you. Just describe what you want to build, and I\'ll create the blocks and connections automatically!' 
        : 'Hi! I\'m your workflow copilot, but I need an OpenAI API key to function. Please configure your API key in the .env.local file.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Keep a stable ref to the sender to avoid effect dependencies noise
  const handleSendMessageRef = useRef<(messageContent?: string) => Promise<void>>();

  // If a seed is present, auto-send it once, then clear the seed
  useEffect(() => {
    if (copilotSeed) {
      // Send as a normal user message (avoid adding a separate "seed" preview message)
      handleSendMessageRef.current?.(copilotSeed);
      setCopilotSeed(null);
    }
  }, [copilotSeed, setCopilotSeed]);

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent ?? input.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    if (messageContent === undefined) setInput('');
    setIsGenerating(true);

    try {
      // Check if user wants to create a workflow
      const lc = content.toLowerCase();
      const isWorkflowRequest = lc.includes('create') || lc.includes('build') || lc.includes('make') || lc.includes('workflow');

      if (isWorkflowRequest && openaiService.isConfigured()) {
        await handleWorkflowGeneration(content, userMessage);
      } else {
        await handleRegularChat(content, userMessage);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // keep ref updated with the latest impl on every render (no deps to avoid lint churn)
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const handleRegularChat = async (content: string, userMessage: ChatMessage) => {
    const conversationHistory = messages
      .filter(m => m.id !== 'welcome' && m.role !== 'user' || m.id !== userMessage.id)
      .map(m => ({ role: m.role, content: m.content }));

    // Create streaming message
    const streamingMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    setMessages(prev => [...prev, streamingMessage]);

    let fullContent = '';
    await copilotService.streamChatWithContext(
      content,
      conversationHistory,
      (chunk) => {
        fullContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === streamingMessage.id 
            ? { ...m, content: fullContent }
            : m
        ));
      }
    );

    // Mark streaming as complete
    setMessages(prev => prev.map(m => 
      m.id === streamingMessage.id 
        ? { ...m, isStreaming: false }
        : m
    ));
  };

  const handleWorkflowGeneration = async (content: string, userMessage: ChatMessage) => {
    setIsCreatingWorkflow(true);
    
    try {
      // Generate workflow plan
      const plan = await copilotService.generateWorkflowPlan(content);
      
      // Create explanation message
      const explanationMessage: ChatMessage = {
        id: `explanation-${Date.now()}`,
        role: 'assistant',
        content: `I'll create a workflow for you: "${plan.description}"\n\nLet me build this automatically...`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, explanationMessage]);
      
      // Implement the workflow
      const { nodes, edges } = await copilotService.implementWorkflowPlan(plan);
      
      // Update the current workflow
      if (currentWorkspaceId && currentWorkflowId) {
        const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
        const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);
        
        if (currentWorkflow) {
          const updatedWorkflow = {
            ...currentWorkflow,
            nodes: [...currentWorkflow.nodes, ...nodes],
            edges: [...currentWorkflow.edges, ...edges],
            updatedAt: new Date().toISOString()
          };
          
          updateWorkflow(currentWorkspaceId, updatedWorkflow);
        }
      }
      
      // Success message
      const successMessage: ChatMessage = {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: `✅ Workflow created successfully! I've added ${nodes.length} blocks and ${edges.length} connections to your canvas. The workflow includes:\n\n${plan.blocks.map(b => `• ${b.name}: ${b.description}`).join('\n')}\n\nYou can now run the workflow or modify the blocks as needed!`,
        timestamp: new Date().toISOString(),
        workflowGenerated: true
      };
      
      setMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('Workflow generation error:', error);
      const errorMessage: ChatMessage = {
        id: `workflow-error-${Date.now()}`,
        role: 'assistant',
        content: `I encountered an error while creating the workflow: ${error instanceof Error ? error.message : 'Unknown error'}. Let me try to help you in a different way.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCreatingWorkflow(false);
    }
  };

  const handleSend = () => handleSendMessage();

  const generateQuickWorkflow = async (type: 'chatbot' | 'api-processor' | 'data-analyzer') => {
    const prompts = {
      chatbot: 'Create a customer support chatbot workflow that can answer questions and escalate to human agents when needed',
      'api-processor': 'Create a workflow that fetches data from an API, processes it, and sends the results via email',
      'data-analyzer': 'Create a data analysis workflow that takes input data, analyzes it with AI, and generates a report'
    };
    
    await handleSendMessage(prompts[type]);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Copilot</h3>
            <Badge variant={openaiService.isConfigured() ? "default" : "destructive"} className="text-xs">
              {openaiService.isConfigured() ? "Active" : "No API Key"}
            </Badge>
          </div>
          

        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[85%] p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : message.workflowGenerated
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-card'
              }`}>
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-0.5">
                      {message.workflowGenerated ? (
                        <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                      )}
                    </p>
                    <span className={`text-xs mt-2 block ${
                      message.role === 'user' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          ))}
          
          {(isGenerating || isCreatingWorkflow) && (
            <div className="flex justify-start">
              <Card className="max-w-[85%] p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">
                    {isCreatingWorkflow ? 'Creating workflow...' : 'Thinking...'}
                  </span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {openaiService.isConfigured() && (
        <div className="p-4 border-b border-border">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick Workflows:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateQuickWorkflow('chatbot')}
                disabled={isGenerating || isCreatingWorkflow}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Chatbot
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateQuickWorkflow('api-processor')}
                disabled={isGenerating || isCreatingWorkflow}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                API Processor
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateQuickWorkflow('data-analyzer')}
                disabled={isGenerating || isCreatingWorkflow}
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Data Analyzer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              openaiService.isConfigured() 
                ? "Describe the workflow you want to create..." 
                : "Configure OpenAI API key to use AI features"
            }
            className="min-h-[60px] resize-none"
            disabled={!openaiService.isConfigured()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isGenerating || isCreatingWorkflow || !openaiService.isConfigured()}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!openaiService.isConfigured() && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
            <Settings className="w-3 h-3 inline mr-1" />
            Add your OpenAI API key to .env.local to enable AI features
          </div>
        )}
      </div>
    </div>
  );
}
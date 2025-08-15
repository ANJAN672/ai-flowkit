import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function Copilot() {
  const { toggleCopilot } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your workflow copilot. I can help you build and optimize your workflows. What would you like to create?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // Simulate AI response (in real implementation, call AI API)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generateMockResponse(input),
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsGenerating(false);
    }, 1500);
  };

  const generateMockResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('agent') || lowerInput.includes('ai')) {
      return 'I can help you create an AI agent! You\'ll want to use the "AI Agent" block from the palette. Configure the system prompt to define the agent\'s role, then connect it to other blocks for processing the response.';
    }
    
    if (lowerInput.includes('api') || lowerInput.includes('request')) {
      return 'For API calls, drag the "HTTP Request" block to your canvas. Configure the method, URL, and headers. You can then process the response with condition blocks or pass it to other integrations.';
    }
    
    if (lowerInput.includes('condition') || lowerInput.includes('if')) {
      return 'Use the "Condition" block to add branching logic to your workflow. Write JavaScript expressions to evaluate data from previous steps and route the flow accordingly.';
    }
    
    return 'That sounds interesting! I recommend starting with a "Start" block, then adding the specific blocks you need from the palette on the left. Connect them with edges to define the flow. What specific functionality are you trying to build?';
  };

  const generateBlocks = () => {
    // Mock block generation
    const suggestions = [
      { type: 'agent', name: 'AI Assistant', description: 'Helpful AI agent for customer support' },
      { type: 'api', name: 'Data Fetcher', description: 'Fetch user data from API' },
      { type: 'condition', name: 'Response Router', description: 'Route based on response type' }
    ];

    const assistantMessage: ChatMessage = {
      id: `blocks-${Date.now()}`,
      role: 'assistant',
      content: `Here are some suggested blocks for your workflow:\n\n${suggestions.map(s => `• ${s.name}: ${s.description}`).join('\n')}\n\nYou can drag these from the palette on the left!`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, assistantMessage]);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">AI Copilot</h3>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          
          <Button variant="ghost" size="sm" onClick={toggleCopilot}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`max-w-[80%] p-3 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card'
              }`}>
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                </p>
                <span className={`text-xs mt-2 block ${
                  message.role === 'user' 
                    ? 'text-primary-foreground/70' 
                    : 'text-muted-foreground'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </Card>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateBlocks}>
            <Sparkles className="w-3 h-3 mr-1" />
            Suggest Blocks
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about workflow building..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isGenerating}
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
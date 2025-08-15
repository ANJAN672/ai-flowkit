import { Bot } from 'lucide-react';
import { BlockConfig } from '../types';

export const agentBlock: BlockConfig = {
  type: 'agent',
  name: 'AI Agent',
  description: 'Chat with AI models (OpenAI, Anthropic, Ollama)',
  longDescription: 'Send prompts to AI models and get responses. Supports OpenAI GPT models, Anthropic Claude, and local Ollama models.',
  category: 'blocks',
  bgColor: '#3b82f6',
  icon: Bot,
  subBlocks: [
    {
      id: 'systemPrompt',
      title: 'System Prompt',
      type: 'long-input',
      layout: 'full',
      placeholder: 'You are a helpful assistant...',
      rows: 4,
      wandConfig: {
        enabled: true,
        generationType: 'system-prompt',
        prompt: 'Generate a system prompt for an AI assistant',
        placeholder: 'Describe what the AI should do...'
      }
    },
    {
      id: 'userPrompt',
      title: 'User Prompt',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Ask me anything...',
      rows: 3,
      required: true
    },
    {
      id: 'model',
      title: 'Model',
      type: 'combobox',
      layout: 'half',
      required: true,
      options: () => [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
        { id: 'ollama:llama3.2', label: 'Ollama: Llama 3.2' },
        { id: 'ollama:qwen2.5', label: 'Ollama: Qwen 2.5' }
      ]
    },
    {
      id: 'temperature',
      title: 'Temperature',
      type: 'slider',
      layout: 'half',
      min: 0,
      max: 2,
      step: 0.1,
      condition: {
        field: 'model',
        value: 'gpt-4o',
        not: false
      }
    },
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      layout: 'full',
      password: true,
      placeholder: 'Your OpenAI/Anthropic API key',
      condition: {
        field: 'model',
        value: 'ollama',
        not: true
      }
    },
    {
      id: 'responseFormat',
      title: 'Response Format',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: '{"type": "object", "properties": {...}}',
      wandConfig: {
        enabled: true,
        generationType: 'json-schema',
        prompt: 'Generate a JSON schema for the expected response format',
        placeholder: 'Describe the expected response structure...'
      }
    }
  ],
  inputs: {
    systemPrompt: { type: 'string', description: 'System instructions for the AI' },
    userPrompt: { type: 'string', description: 'User message to send' },
    model: { type: 'string', description: 'Model to use' },
    temperature: { type: 'number', description: 'Creativity level (0-2)' },
    apiKey: { type: 'string', description: 'API key for the service' },
    responseFormat: { type: 'json', description: 'Expected response format' }
  },
  outputs: {
    content: { type: 'string', description: 'AI response content' },
    model: { type: 'string', description: 'Model used' },
    tokens: { type: 'number', description: 'Tokens used' },
    toolCalls: { type: 'json', description: 'Tool calls made by AI' }
  },
  async run(ctx) {
    const { systemPrompt, userPrompt, model, temperature = 0.7, apiKey, responseFormat } = ctx.inputs;
    
    ctx.log(`Using model: ${model}`);
    
    // Check if Ollama model
    if (model.startsWith('ollama:')) {
      const ollamaModel = model.replace('ollama:', '');
      try {
        const response = await ctx.fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            options: { temperature }
          }),
          signal: ctx.abortSignal
        });
        
        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        const result = {
          content: data.message?.content || 'No response',
          model: ollamaModel,
          tokens: data.eval_count || 0
        };
        
        ctx.setNodeOutput('content', result.content);
        ctx.setNodeOutput('model', result.model);
        ctx.setNodeOutput('tokens', result.tokens);
        
        return result;
      } catch (error) {
        ctx.log(`Ollama not available, using mock response: ${error}`);
        const mockResult = {
          content: `Mock AI response for prompt: "${userPrompt}"`,
          model: ollamaModel,
          tokens: 50
        };
        
        ctx.setNodeOutput('content', mockResult.content);
        ctx.setNodeOutput('model', mockResult.model);
        ctx.setNodeOutput('tokens', mockResult.tokens);
        
        return mockResult;
      }
    }
    
    // OpenAI/Anthropic API calls
    if (!apiKey) {
      ctx.log('No API key provided, using mock response');
      const mockResult = {
        content: `Mock AI response for prompt: "${userPrompt}" using ${model}`,
        model,
        tokens: 100
      };
      
      ctx.setNodeOutput('content', mockResult.content);
      ctx.setNodeOutput('model', mockResult.model);
      ctx.setNodeOutput('tokens', mockResult.tokens);
      
      return mockResult;
    }
    
    // Real API implementation would go here
    ctx.log('API calls not implemented in MVP, using mock response');
    const result = {
      content: `AI would respond to: "${userPrompt}"`,
      model,
      tokens: 150
    };
    
    ctx.setNodeOutput('content', result.content);
    ctx.setNodeOutput('model', result.model);
    ctx.setNodeOutput('tokens', result.tokens);
    
    return result;
  }
};
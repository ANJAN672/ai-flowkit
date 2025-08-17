import { Bot } from 'lucide-react';
import { createElement } from 'react';
import type { FC } from 'react';
import { BlockConfig } from '../types';

const BotIcon: FC<{ size?: number }> = ({ size }) => createElement(Bot, { size });

export const agentBlock: BlockConfig = {
  type: 'agent',
  name: 'AI Agent',
  description: 'Chat with AI models (OpenAI, Anthropic, Ollama)',
  longDescription: 'Send prompts to AI models and get responses. Supports OpenAI GPT models, Anthropic Claude, and local Ollama models.',
  category: 'blocks',
  bgColor: '#6366f1',
  icon: BotIcon,
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
        // OpenAI (listed first)
        { id: 'openai:gpt-4o', label: 'OpenAI — GPT-4o' },
        { id: 'openai:gpt-4o-mini', label: 'OpenAI — GPT-4o Mini' },
        { id: 'openai:gpt-4.1', label: 'OpenAI — GPT-4.1' },
        { id: 'openai:gpt-4.1-mini', label: 'OpenAI — GPT-4.1 Mini' },
        { id: 'openai:gpt-3.5-turbo', label: 'OpenAI — GPT-3.5 Turbo' },

        // Google
        { id: 'google:gemini-1.5-pro', label: 'Google — Gemini 1.5 Pro' },
        { id: 'google:gemini-1.5-flash', label: 'Google — Gemini 1.5 Flash' },
        { id: 'google:gemini-1.0-pro', label: 'Google — Gemini 1.0 Pro' },

        // Mistral
        { id: 'mistral:mistral-large-latest', label: 'Mistral — Mistral Large (latest)' },
        { id: 'mistral:open-mixtral-8x7b', label: 'Mistral — Mixtral 8x7B Instruct' },
        { id: 'mistral:mistral-small-latest', label: 'Mistral — Mistral Small (latest)' },

        // Azure OpenAI (use deployment name via id after prefix)
        { id: 'azure:gpt-4o', label: 'Azure OpenAI — GPT-4o (deployment)' },
        { id: 'azure:gpt-4o-mini', label: 'Azure OpenAI — GPT-4o Mini (deployment)' },

        // Local (kept at end)
        { id: 'ollama:llama3.2', label: 'Ollama — Llama 3.2' },
        { id: 'ollama:qwen2.5', label: 'Ollama — Qwen 2.5' }
      ]
    },
    {
      id: 'temperature',
      title: 'Temperature',
      type: 'slider',
      layout: 'half',
      min: 0,
      max: 2,
      step: 0.1
    },
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      layout: 'full',
      password: true,
      placeholder: 'API key (OpenAI / Google / Mistral / Azure — optional if set in env)',
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
    const modelStr = String(model ?? '');
    if (modelStr.startsWith('ollama:')) {
      const ollamaModel = modelStr.replace('ollama:', '');
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
          content: `Mock AI response for prompt: "${String(userPrompt)}"`,
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
    const finalApiKey = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!finalApiKey) {
      ctx.log('No API key provided, using mock response');
      const mockResult = {
        content: `Mock AI response for prompt: "${String(userPrompt)}" using ${modelStr}`,
        model: modelStr,
        tokens: 100
      };
      
      ctx.setNodeOutput('content', mockResult.content);
      ctx.setNodeOutput('model', mockResult.model);
      ctx.setNodeOutput('tokens', mockResult.tokens);
      
      return mockResult;
    }
    
    // Real OpenAI API implementation
    try {
      ctx.log('Making OpenAI API call...');
      
      const messages = [
        ...(systemPrompt ? [{ role: 'system', content: String(systemPrompt) }] : []),
        { role: 'user', content: String(userPrompt) }
      ];

      const requestBody: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature: number;
        max_tokens: number;
        response_format?: { type: string };
      } = {
        model: modelStr,
        messages,
        temperature: Number(temperature),
        max_tokens: 1000
      };

      // Add response format if provided
      if (responseFormat) {
        try {
          const format = typeof responseFormat === 'string' ? JSON.parse(responseFormat) : responseFormat;
          requestBody.response_format = { type: 'json_object' };
          // Add format instruction to system prompt
          if (format && typeof format === 'object') {
            const formatInstruction = `\n\nPlease respond with valid JSON that matches this schema: ${JSON.stringify(format)}`;
            if (messages[0]?.role === 'system') {
              messages[0].content += formatInstruction;
            } else {
              messages.unshift({ role: 'system', content: `You are a helpful assistant.${formatInstruction}` });
            }
          }
        } catch (e) {
          ctx.log('Invalid response format, ignoring...');
        }
      }

      const response = await ctx.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: ctx.abortSignal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const result = {
        content: data.choices[0]?.message?.content || 'No response',
        model: modelStr,
        tokens: data.usage?.total_tokens || 0,
        toolCalls: data.choices[0]?.message?.tool_calls || null
      };

      ctx.log(`API call successful. Used ${result.tokens} tokens.`);
      
      ctx.setNodeOutput('content', result.content);
      ctx.setNodeOutput('model', result.model);
      ctx.setNodeOutput('tokens', result.tokens);
      if (result.toolCalls) {
        ctx.setNodeOutput('toolCalls', result.toolCalls);
      }
      
      return result;
    } catch (error) {
      ctx.log(`OpenAI API error: ${error}`);
      
      // Fallback to mock response on error
      const mockResult = {
        content: `Error calling OpenAI API: ${error instanceof Error ? error.message : 'Unknown error'}. Mock response for: "${String(userPrompt)}"`,
        model: modelStr,
        tokens: 0
      };
      
      ctx.setNodeOutput('content', mockResult.content);
      ctx.setNodeOutput('model', mockResult.model);
      ctx.setNodeOutput('tokens', mockResult.tokens);
      
      return mockResult;
    }
  }
};
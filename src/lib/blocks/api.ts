import { Globe } from 'lucide-react';
import { createElement } from 'react';
import type { FC } from 'react';
import { BlockConfig } from '../types';

const GlobeIcon: FC<{ size?: number }> = ({ size }) => createElement(Globe, { size });

export const apiBlock: BlockConfig = {
  type: 'api',
  name: 'HTTP Request',
  description: 'Make HTTP requests to external APIs',
  category: 'blocks',
  bgColor: '#f59e0b',
  icon: GlobeIcon,
  subBlocks: [
    {
      id: 'method',
      title: 'Method',
      type: 'combobox',
      layout: 'half',
      required: true,
      options: () => [
        { id: 'GET', label: 'GET' },
        { id: 'POST', label: 'POST' },
        { id: 'PUT', label: 'PUT' },
        { id: 'PATCH', label: 'PATCH' },
        { id: 'DELETE', label: 'DELETE' }
      ]
    },
    {
      id: 'url',
      title: 'URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'https://api.example.com/endpoint',
      required: true
    },
    {
      id: 'headers',
      title: 'Headers',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: '{"Authorization": "Bearer token", "Content-Type": "application/json"}'
    },
    {
      id: 'body',
      title: 'Body',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: '{"key": "value"}',
      condition: {
        field: 'method',
        value: 'GET',
        not: true
      }
    },
    {
      id: 'timeout',
      title: 'Timeout (ms)',
      type: 'number',
      layout: 'half',
      min: 1000,
      max: 60000,
      step: 1000
    }
  ],
  inputs: {
    method: { type: 'string', description: 'HTTP method' },
    url: { type: 'string', description: 'Request URL' },
    headers: { type: 'json', description: 'Request headers' },
    body: { type: 'json', description: 'Request body' },
    timeout: { type: 'number', description: 'Request timeout in milliseconds' }
  },
  outputs: {
    status: { type: 'number', description: 'HTTP status code' },
    headers: { type: 'json', description: 'Response headers' },
    data: { type: 'json', description: 'Response data' },
    error: { type: 'string', description: 'Error message if request failed' }
  },
  async run(ctx) {
  const { method, url, headers = {}, body, timeout = 30000 } = ctx.inputs as Record<string, unknown>;
    
    ctx.log(`Making ${method} request to ${url}`);
    
    try {
  const controller = new AbortController();
  const timeoutMs = Number(timeout) || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const requestOptions: RequestInit = {
        method: String(method),
        headers: {
          'Content-Type': 'application/json',
          ...(headers as Record<string, string>)
        },
        signal: controller.signal
      };
      
      if (body && method !== 'GET') {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
      
  const response = await ctx.fetch(String(url), requestOptions);
      clearTimeout(timeoutId);
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      const result = {
        status: response.status,
        headers: responseHeaders,
        data
      };
      
      ctx.setNodeOutput('status', result.status);
      ctx.setNodeOutput('headers', result.headers);
      ctx.setNodeOutput('data', result.data);
      
      ctx.log(`Request completed with status ${response.status}`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ctx.log(`Request failed: ${errorMessage}`);
      
      ctx.setNodeOutput('error', errorMessage);
      
      throw new Error(`HTTP request failed: ${errorMessage}`);
    }
  }
};
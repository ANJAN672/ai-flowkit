import { CheckCircle } from 'lucide-react';
import { BlockConfig } from '../types';

export const responseBlock: BlockConfig = {
  type: 'response',
  name: 'Response',
  description: 'Final output of the workflow',
  category: 'io',
  bgColor: '#10b981',
  icon: CheckCircle as unknown as React.FC<{ size?: number }>,
  subBlocks: [
    {
      id: 'message',
      title: 'Response Message',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Workflow completed successfully',
      rows: 3
    },
    {
      id: 'includeInputs',
      title: 'Include All Inputs',
      type: 'toggle',
      layout: 'half'
    }
  ],
  inputs: {
    message: { type: 'string', description: 'Response message' },
    includeInputs: { type: 'any', description: 'Whether to include all workflow data' },
    data: { type: 'any', description: 'Response data' }
  },
  outputs: {
    response: { type: 'json', description: 'Final workflow response' }
  },
  async run(ctx) {
    const { message, includeInputs, data } = ctx.inputs as { message?: unknown; includeInputs?: unknown; data?: unknown };
    
    ctx.log('Generating workflow response');
    
    const response: Record<string, unknown> = {
      message: (message as string) || 'Workflow completed',
      timestamp: new Date().toISOString(),
      workflowId: ctx.workflowId
    };
    
    if (typeof data !== 'undefined') {
      (response as Record<string, unknown>).data = data;
    }
    
    if (includeInputs) {
      // In a real implementation, collect all node outputs
      (response as Record<string, unknown>).allData = {};
    }
    
  ctx.setNodeOutput('response', response);
  ctx.log(`Response generated: ${String(response.message)}`);
    
    return response;
  }
};
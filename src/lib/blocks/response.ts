import { CheckCircle } from 'lucide-react';
import { BlockConfig } from '../types';

export const responseBlock: BlockConfig = {
  type: 'response',
  name: 'Response',
  description: 'Final output of the workflow',
  category: 'io',
  bgColor: '#10b981',
  icon: CheckCircle,
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
    const { message, includeInputs, data } = ctx.inputs;
    
    ctx.log('Generating workflow response');
    
    const response: any = {
      message: message || 'Workflow completed',
      timestamp: new Date().toISOString(),
      workflowId: ctx.workflowId
    };
    
    if (data) {
      response.data = data;
    }
    
    if (includeInputs) {
      // In a real implementation, collect all node outputs
      response.allData = {};
    }
    
    ctx.setNodeOutput('response', response);
    ctx.log(`Response generated: ${response.message}`);
    
    return response;
  }
};
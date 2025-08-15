import { Play } from 'lucide-react';
import { BlockConfig } from '../types';

export const starterBlock: BlockConfig = {
  type: 'starter',
  name: 'Start',
  description: 'Entry point for the workflow',
  category: 'blocks',
  bgColor: '#10b981',
  icon: Play,
  inputs: {},
  outputs: {
    trigger: { type: 'any', description: 'Workflow started' },
    payload: { type: 'json', description: 'Initial payload' }
  },
  async run(ctx) {
    ctx.log('Workflow started');
    const result = {
      startedAt: new Date().toISOString(),
      workflowId: ctx.workflowId
    };
    ctx.setNodeOutput('trigger', true);
    ctx.setNodeOutput('payload', result);
    return result;
  }
};
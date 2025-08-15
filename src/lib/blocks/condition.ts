import { GitBranch } from 'lucide-react';
import { BlockConfig } from '../types';

export const conditionBlock: BlockConfig = {
  type: 'condition',
  name: 'Condition',
  description: 'Branch workflow based on conditions',
  category: 'control',
  bgColor: '#8b5cf6',
  icon: GitBranch,
  subBlocks: [
    {
      id: 'expression',
      title: 'Condition Expression',
      type: 'code',
      layout: 'full',
      language: 'javascript',
      placeholder: 'status === 200 && data.success === true',
      required: true
    }
  ],
  inputs: {
    expression: { type: 'string', description: 'JavaScript expression to evaluate' }
  },
  outputs: {
    result: { type: 'any', description: 'Condition result (true/false)' }
  },
  async run(ctx) {
    const { expression } = ctx.inputs;
    
    ctx.log(`Evaluating condition: ${expression}`);
    
    try {
      // Get all previous node outputs for the evaluation context
      const context: Record<string, any> = {};
      
      // Simple expression evaluation (in a real implementation, use a safe sandbox)
      // For MVP, we'll do basic pattern matching
      const result = evaluateExpression(expression, context);
      
      ctx.setNodeOutput('result', result);
      ctx.log(`Condition result: ${result}`);
      
      return { result };
    } catch (error) {
      ctx.log(`Condition evaluation failed: ${error}`);
      const result = false;
      ctx.setNodeOutput('result', result);
      return { result };
    }
  }
};

// Simple expression evaluator for MVP
function evaluateExpression(expression: string, context: Record<string, any>): boolean {
  // For MVP, just return true for non-empty expressions
  // In a real implementation, use a safe JS sandbox
  return expression.trim().length > 0;
}
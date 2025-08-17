import { openaiService } from './openai';
import { getAllBlocks, getBlockConfig } from '../blocks/registry';
import { useAppStore } from '../store';
import type { WorkflowNode, WorkflowEdge } from '../types';

interface BlockSuggestion {
  type: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  connections?: {
    from?: string;
    to?: string[];
  };
}

interface WorkflowPlan {
  description: string;
  blocks: BlockSuggestion[];
  connections: Array<{
    from: string;
    to: string;
    description?: string;
  }>;
}

export class CopilotService {
  private getAvailableBlocks() {
    return getAllBlocks()
      .filter(block => block.type !== 'starter') // Exclude starter block
      .map(block => ({
        type: block.type,
        name: block.name,
        description: block.description || '',
        category: block.category,
        inputs: block.inputs || {},
        outputs: block.outputs || {},
        subBlocks: block.subBlocks?.map(sb => ({
          id: sb.id,
          title: sb.title,
          type: sb.type,
          required: sb.required || false,
          placeholder: sb.placeholder || ''
        })) || []
      }));
  }

  private createSystemPrompt(): string {
    const blocks = this.getAvailableBlocks();
    
    return `You are an AI workflow copilot for AGEN8, a visual workflow builder. Your job is to help users create workflows by autonomously selecting and arranging blocks.

Available blocks (use EXACT type strings in 'type'): 
${blocks.map(block => `
- ${block.name} (type: ${block.type}): ${block.description}
  Category: ${block.category}
  Inputs: ${Object.keys(block.inputs).join(', ') || 'none'}
  Outputs: ${Object.keys(block.outputs).join(', ') || 'none'}
  Configuration: ${block.subBlocks.map(sb => `${sb.title} (${sb.type}${sb.required ? ', required' : ''})`).join(', ') || 'none'}
`).join('')}

When a user describes what they want to build, you should:
1. Analyze their requirements
2. Select appropriate blocks
3. Suggest how to configure each block
4. Plan the connections between blocks
5. Provide a complete workflow plan

Always respond with a JSON object in this format:
{
  "description": "Brief description of the workflow",
  "blocks": [
    {
      "type": "exact_block_type_from_list_above",
      "name": "Display name",
      "description": "What this block does in the workflow",
      "data": {
        "label": "Block Label",
        "field1": "configured_value",
        "field2": "another_value"
      }
    }
  ],
  "connections": [
    {
      "from": "name_or_type_of_source_block",
      "to": "name_or_type_of_target_block",
      "description": "Why these blocks are connected"
    }
  ],
  "explanation": "Step-by-step explanation of how the workflow works"
}

Strict rules:
- Do NOT create or suggest a new 'starter' block. Use the existing one implicitly.
- Only use block types from the Available blocks list. If unsure, choose the closest valid type (e.g., 'agent' for chatbots, 'response' for outputs, 'condition' for branching).
- Prefer names that match their purpose so mapping is reliable.
- Provide minimal but valid configuration for required fields.

Be practical. The result must be buildable from the provided block types.`;
  }

  async generateWorkflowPlan(userPrompt: string): Promise<WorkflowPlan> {
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI API is not configured. Please set up your API key.');
    }

    const systemPrompt = this.createSystemPrompt();
    
    const response = await openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.3, // Lower temperature for more consistent JSON output
      maxTokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const plan = JSON.parse(jsonMatch[0]) as WorkflowPlan;
      
      // Validate the plan structure
      if (!plan.blocks || !Array.isArray(plan.blocks)) {
        throw new Error('Invalid workflow plan: missing blocks array');
      }

      return plan;
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      throw new Error(`Failed to parse workflow plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async implementWorkflowPlan(plan: WorkflowPlan): Promise<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }> {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    const nodeIdMap = new Map<string, string>(); // Map from plan block key to actual node ID

    // Get current workflow to position nodes near existing canvas area
    const store = useAppStore.getState();
    const currentWorkspace = store.workspaces.find(ws => ws.id === store.currentWorkspaceId);
    const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === store.currentWorkflowId);

    let baseX = 80;
    let baseY = 80;
    const xGap = 260; // spacing similar to n8n/sim.ai
    const yGap = 140;

    if (currentWorkflow && currentWorkflow.nodes.length > 0) {
      const starterNode = currentWorkflow.nodes.find(n => n.type === 'starter' || n.type?.toLowerCase() === 'start');
      if (starterNode) {
        // Always reuse the single starter node; never create another
        nodeIdMap.set('starter', starterNode.id);
        nodeIdMap.set('start', starterNode.id);
        baseX = starterNode.position.x + xGap;
        baseY = starterNode.position.y;
      } else {
        const maxX = Math.max(...currentWorkflow.nodes.map(n => n.position.x));
        const minY = Math.min(...currentWorkflow.nodes.map(n => n.position.y));
        baseX = maxX + xGap;
        baseY = minY;
      }
    }

    // helper: normalize key names for robust mapping
    const norm = (s: string | undefined) => String(s || '').trim().toLowerCase();

    // Create nodes from the plan and position them in a compact grid near baseX/baseY
    plan.blocks.forEach((blockSuggestion, index) => {
      // Never create another starter/start block; reuse existing
      const bt = norm(blockSuggestion.type);
      if (bt === 'starter' || bt === 'start') {
        return; // skip creating duplicates
      }

      const blockConfig = getBlockConfig(blockSuggestion.type);
      if (!blockConfig) {
        console.warn(`Unknown block type: ${blockSuggestion.type}`);
        return;
      }

      const nodeId = `${blockSuggestion.type}-${Date.now()}-${index}`;

      // Map by a stable key: prefer provided name, else type+index
      const mapKey = norm(blockSuggestion.name || `${blockSuggestion.type}-${index}`);
      nodeIdMap.set(mapKey, nodeId);

      // Prepare default data based on block configuration
      const defaultData: Record<string, unknown> = {
        label: blockSuggestion.name || blockConfig.name,
        ...blockSuggestion.data
      };

      // Set defaults for required fields
      blockConfig.subBlocks?.forEach(subBlock => {
        if (subBlock.required && !defaultData[subBlock.id]) {
          switch (subBlock.type) {
            case 'short-input':
            case 'long-input':
              defaultData[subBlock.id] = subBlock.placeholder || '';
              break;
            case 'number':
              defaultData[subBlock.id] = 0;
              break;
            case 'toggle':
              defaultData[subBlock.id] = false;
              break;
            case 'combobox': {
              const options = typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options || [];
              defaultData[subBlock.id] = options[0]?.id || '';
              break;
            }
            default:
              defaultData[subBlock.id] = '';
          }
        }
      });

      // Compute a compact position near existing nodes; ignore absolute plan coordinates
      const col = index % 3;
      const row = Math.floor(index / 3);
      const position = {
        x: baseX + col * xGap,
        y: baseY + row * yGap,
      };

      const node: WorkflowNode = {
        id: nodeId,
        type: blockSuggestion.type,
        position,
        data: defaultData
      };

      nodes.push(node);
    });

    // Create edges from the plan
    plan.connections.forEach((connection, index) => {
      const fromKey = norm(connection.from);
      const toKey = norm(connection.to);

      // Try several mapping strategies: by normalized name key, by raw id, and by known synonyms
      const synonym = (k: string) => (k === 'start' ? 'starter' : k);

      const fromId = nodeIdMap.get(fromKey)
        || nodeIdMap.get(synonym(fromKey))
        || nodeIdMap.get(connection.from)
        || connection.from;
      const toId = nodeIdMap.get(toKey)
        || nodeIdMap.get(synonym(toKey))
        || nodeIdMap.get(connection.to)
        || connection.to;

      if (fromId && toId) {
        const edge: WorkflowEdge = {
          id: `edge-${fromId}-${toId}-${index}`,
          source: fromId,
          target: toId
        };
        edges.push(edge);
      }
    });

    return { nodes, edges };
  }

  async chatWithContext(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!openaiService.isConfigured()) {
      return "I'm sorry, but the OpenAI API is not configured. Please set up your API key to use the AI copilot.";
    }

    const systemPrompt = `You are an AI copilot for AGEN8, a visual workflow builder. You help users create, modify, and understand workflows.

Available capabilities:
- Create complete workflows from user descriptions
- Explain how workflows work
- Suggest improvements to existing workflows
- Help with block configuration
- Troubleshoot workflow issues

Available blocks: ${this.getAvailableBlocks().map(b => `${b.name} (${b.type})`).join(', ')}

Be helpful, concise, and practical. When users ask to create workflows, offer to build them automatically.`;

    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      const response = await openaiService.chat(messages, {
        temperature: 0.7,
        maxTokens: 1000
      });

      return response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error('Copilot chat error:', error);
      return `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }

  async streamChatWithContext(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (content: string) => void
  ): Promise<void> {
    if (!openaiService.isConfigured()) {
      onChunk("I'm sorry, but the OpenAI API is not configured. Please set up your API key to use the AI copilot.");
      return;
    }

    const systemPrompt = `You are an AI copilot for AGEN8, a visual workflow builder. You help users create, modify, and understand workflows.

Available capabilities:
- Create complete workflows from user descriptions
- Explain how workflows work
- Suggest improvements to existing workflows
- Help with block configuration
- Troubleshoot workflow issues

Available blocks: ${this.getAvailableBlocks().map(b => `${b.name} (${b.type})`).join(', ')}

Be helpful, concise, and practical. When users ask to create workflows, offer to build them automatically.`;

    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      await openaiService.chatStream(messages, onChunk, {
        temperature: 0.7,
        maxTokens: 1000
      });
    } catch (error) {
      console.error('Copilot stream chat error:', error);
      onChunk(`I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }
}

export const copilotService = new CopilotService();
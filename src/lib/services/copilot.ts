import { openaiService } from './openai';
import { getAllBlocks, getBlockConfig, blockRegistry } from '../blocks/registry';
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
    
    return `You are an AI workflow copilot for AGEN8, a visual workflow builder. Your job is to help users create comprehensive, well-structured workflows by autonomously selecting and arranging blocks.

Available blocks (use EXACT type strings in 'type'): 
${blocks.map(block => `
- ${block.name} (type: ${block.type}): ${block.description}
  Category: ${block.category}
  Inputs: ${Object.keys(block.inputs).join(', ') || 'none'}
  Outputs: ${Object.keys(block.outputs).join(', ') || 'none'}
  Configuration: ${block.subBlocks.map(sb => `${sb.title} (${sb.type}${sb.required ? ', required' : ''})`).join(', ') || 'none'}
`).join('')}

WORKFLOW DESIGN PRINCIPLES:
1. **Think End-to-End**: Always consider the complete user journey from input to final output
2. **Add Processing Steps**: Include data transformation, validation, and processing blocks
3. **Include Error Handling**: Add condition blocks for error scenarios when appropriate
4. **Proper Flow**: Ensure logical sequence - Input → Process → Transform → Output
5. **Rich Workflows**: Aim for 4-8 blocks minimum for comprehensive automation
6. **Real-world Logic**: Consider authentication, data validation, formatting, notifications

WORKFLOW PATTERNS TO FOLLOW:
- **Data Processing**: Input → Validate → Transform → Process → Store → Notify
- **API Integration**: Auth → Fetch → Process → Transform → Store/Send → Response
- **Automation**: Trigger → Fetch Data → Process → Decision → Action → Notification
- **Content Creation**: Input → Generate → Review → Format → Publish → Track

When a user describes what they want to build, you should:
1. **Analyze Requirements**: Break down the user's request into specific steps
2. **Design Complete Flow**: Plan a comprehensive workflow with proper sequence
3. **Select Appropriate Blocks**: Choose blocks that create a realistic automation
4. **Configure Meaningfully**: Set up blocks with realistic configurations
5. **Connect Logically**: Ensure proper data flow between blocks

Always respond with a JSON object in this format:
{
  "description": "Comprehensive description of the complete workflow",
  "blocks": [
    {
      "type": "exact_block_type_from_list_above",
      "name": "Descriptive Display Name",
      "description": "Detailed explanation of what this block does in the workflow",
      "data": {
        "label": "Meaningful Block Label",
        "field1": "realistic_configured_value",
        "field2": "another_realistic_value"
      }
    }
  ],
  "connections": [
    {
      "from": "starter",
      "to": "first_block_name",
      "description": "Workflow starts from the starter node"
    },
    {
      "from": "first_block_name",
      "to": "second_block_name",
      "description": "Data flows from first to second block"
    }
  ],
  "explanation": "Detailed step-by-step explanation of the complete workflow process"
}

CRITICAL RULES:
- **NO Simple 2-Block Workflows**: Always create comprehensive workflows with multiple processing steps
- **Starter Block**: Never create a 'starter' block - it exists implicitly, but ALWAYS connect from "starter" to your first block
- **Block Types**: ONLY use these EXACT block types: ${Object.keys(blockRegistry).filter(k => k !== 'starter').join(', ')}
- **Realistic Names**: Use descriptive names that clearly indicate the block's purpose
- **Proper Connections**: ALWAYS start with "starter" → first_block, then connect every block in sequence
- **Data Flow**: Think about what data flows between blocks and ensure compatibility
- **Connection Chain**: Every workflow MUST start from "starter" and form a complete chain to the end

IMPORTANT: For a basic AI chatbot, use these blocks:
- "agent" for AI processing (NOT "AI Chatbot" or "chatbot")
- "response" for sending replies (NOT "Send Response")
- "api" for external integrations if needed
- "condition" for logic branching if needed

EXAMPLES OF GOOD WORKFLOW THINKING:
- AI Chatbot → agent (AI processing) → condition (check intent) → response (send reply)
- YouTube Automation → api (YouTube API) → function (Data Processing) → agent (Content Analysis) → api (Google Drive) → response (Notification)
- E-commerce → api (Product Fetch) → function (Price Analysis) → condition (Inventory Check) → api (Update Database) → response (Send Alert)
- Social Media → agent (Content Generation) → function (Image Processing) → api (Scheduling) → api (Post Publishing) → response (Analytics Tracking)

Build workflows that users would actually want to use in real scenarios!`;
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
      temperature: 0.2, // Even lower temperature for more consistent JSON output
      maxTokens: 1500, // Reduced for faster response
      model: 'gpt-4o-mini' // Use faster model for workflow generation
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
      
      console.log('🤖 AI Generated Plan:', plan);
      console.log('📦 Blocks in plan:', plan.blocks?.map(b => `${b.name} (${b.type})`));
      
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

    let starterNodeId = 'starter'; // Default starter ID
    
    if (currentWorkflow && currentWorkflow.nodes.length > 0) {
      const starterNode = currentWorkflow.nodes.find(n => n.type === 'starter' || n.type?.toLowerCase() === 'start');
      if (starterNode) {
        // Always reuse the single starter node; never create another
        starterNodeId = starterNode.id;
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
        console.error(`❌ Unknown block type: "${blockSuggestion.type}". Available types:`, Object.keys(blockRegistry));
        console.error('Block suggestion:', blockSuggestion);
        return;
      }
      
      console.log(`✅ Creating block: ${blockSuggestion.type} -> ${blockConfig.name}`);

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

    // Create edges from the plan with improved mapping
    const createdConnections = new Set<string>();
    
    plan.connections.forEach((connection, index) => {
      const fromKey = norm(connection.from);
      const toKey = norm(connection.to);

      // Enhanced mapping strategies
      const findNodeId = (key: string, originalKey: string) => {
        // Handle starter node specially
        if (key === 'starter' || key === 'start' || originalKey === 'starter' || originalKey === 'start') {
          return starterNodeId;
        }
        
        // Try exact matches first
        if (nodeIdMap.has(key)) return nodeIdMap.get(key);
        if (nodeIdMap.has(originalKey)) return nodeIdMap.get(originalKey);
        
        // Try synonyms
        const synonyms = {
          'input': 'input',
          'output': 'response',
          'result': 'response',
          'end': 'response'
        };
        
        if (synonyms[key] && nodeIdMap.has(synonyms[key])) {
          return nodeIdMap.get(synonyms[key]);
        }
        
        // Try partial matches (find node whose key contains the search term)
        for (const [nodeKey, nodeId] of nodeIdMap.entries()) {
          if (nodeKey.includes(key) || key.includes(nodeKey)) {
            return nodeId;
          }
        }
        
        // Try by block type matching
        const matchingNode = nodes.find(node => 
          norm(node.type).includes(key) || key.includes(norm(node.type))
        );
        
        return matchingNode?.id || null;
      };

      const fromId = findNodeId(fromKey, connection.from);
      const toId = findNodeId(toKey, connection.to);

      // Only create edge if both nodes exist and connection is valid
      if (fromId && toId && fromId !== toId) {
        const connectionKey = `${fromId}-${toId}`;
        if (!createdConnections.has(connectionKey)) {
          const edge: WorkflowEdge = {
            id: `edge-${fromId}-${toId}-${index}`,
            source: fromId,
            target: toId
          };
          edges.push(edge);
          createdConnections.add(connectionKey);
        }
      }
    });

    // ENSURE STARTER CONNECTION: If no connection from starter exists, connect to first node
    const hasStarterConnection = edges.some(edge => edge.source === starterNodeId);
    if (!hasStarterConnection && nodes.length > 0) {
      const firstNode = nodes[0];
      const starterEdge: WorkflowEdge = {
        id: `edge-starter-${firstNode.id}`,
        source: starterNodeId,
        target: firstNode.id
      };
      edges.unshift(starterEdge); // Add at beginning
    }

    // ENSURE CHAIN CONNECTIONS: Connect unconnected nodes in sequence
    const connectedNodes = new Set<string>();
    connectedNodes.add(starterNodeId);
    
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    // Find unconnected nodes and connect them in sequence
    const unconnectedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    if (unconnectedNodes.length > 0) {
      let lastConnectedNode = starterNodeId;
      
      // Find the last node in the current chain
      const targetNodes = new Set(edges.map(e => e.target));
      const sourceNodes = new Set(edges.map(e => e.source));
      const endNodes = nodes.filter(n => !sourceNodes.has(n.id) && targetNodes.has(n.id));
      
      if (endNodes.length > 0) {
        lastConnectedNode = endNodes[endNodes.length - 1].id;
      }

      // Connect unconnected nodes in sequence
      unconnectedNodes.forEach((node, index) => {
        const connectionKey = `${lastConnectedNode}-${node.id}`;
        if (!createdConnections.has(connectionKey)) {
          const edge: WorkflowEdge = {
            id: `edge-auto-${lastConnectedNode}-${node.id}`,
            source: lastConnectedNode,
            target: node.id
          };
          edges.push(edge);
          createdConnections.add(connectionKey);
        }
        lastConnectedNode = node.id;
      });
    }

    console.log('🎯 Final Result:', { 
      nodesCreated: nodes.length, 
      edgesCreated: edges.length,
      nodeTypes: nodes.map(n => n.type),
      connections: edges.map(e => `${e.source} -> ${e.target}`)
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
        maxTokens: 800,
        model: 'gpt-4o-mini' // Use faster model
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
        maxTokens: 800, // Faster response
        model: 'gpt-4o-mini' // Use faster model
      });
    } catch (error) {
      console.error('Copilot stream chat error:', error);
      onChunk(`I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }
}

export const copilotService = new CopilotService();
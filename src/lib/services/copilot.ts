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

  private getAllAvailableBlocks() {
    // Get ALL blocks from registry for comprehensive workflow building
    return getAllBlocks()
      .filter(block => block.type !== 'starter')
      .map(block => ({
        type: block.type,
        name: block.name,
        description: block.description || '',
        category: block.category,
        inputs: block.inputs || {},
        outputs: block.outputs || {},
        useCases: this.getBlockUseCases(block.type),
        keywords: this.getBlockKeywords(block.type, block.name)
      }))
      .sort((a, b) => {
        // Sort by relevance: core blocks first, then popular integrations
        const coreBlocks = ['agent', 'api', 'condition', 'response', 'function'];
        const popularBlocks = ['slack', 'gmail', 'pinecone', 'discord', 'notion', 'airtable', 'github'];
        
        if (coreBlocks.includes(a.type) && !coreBlocks.includes(b.type)) return -1;
        if (!coreBlocks.includes(a.type) && coreBlocks.includes(b.type)) return 1;
        if (popularBlocks.includes(a.type) && !popularBlocks.includes(b.type)) return -1;
        if (!popularBlocks.includes(a.type) && popularBlocks.includes(b.type)) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  private getBlockUseCases(type: string): string[] {
    const useCases: Record<string, string[]> = {
      // Core blocks
      agent: ['AI chat/conversation', 'Content generation', 'Text analysis', 'Decision making', 'Data processing'],
      api: ['Fetch external data', 'Send data to services', 'Webhook calls', 'Authentication', 'Integration'],
      condition: ['Route workflow based on data', 'Error handling', 'Validate responses', 'Branch logic'],
      response: ['Send final output', 'User notifications', 'Return results', 'Workflow completion'],
      function: ['Transform data format', 'Calculate values', 'Parse/extract data', 'Clean/validate input'],
      
      // Popular integrations
      slack: ['Team notifications', 'Workflow alerts', 'Chat messages', 'Channel updates'],
      discord: ['Community notifications', 'Bot messages', 'Server alerts', 'Channel posts'],
      gmail: ['Email sending', 'Email automation', 'Notifications via email', 'Email workflows'],
      pinecone: ['Vector search', 'RAG systems', 'Semantic search', 'AI memory', 'Embeddings storage'],
      notion: ['Knowledge base', 'Note taking', 'Database operations', 'Documentation'],
      airtable: ['Database operations', 'Spreadsheet automation', 'Data storage', 'CRM workflows'],
      github: ['Code management', 'Issue tracking', 'Repository operations', 'CI/CD integration'],
      file: ['File operations', 'Data reading', 'Content processing', 'File management'],
      openai: ['AI processing', 'GPT integration', 'Content generation', 'Text analysis'],
      googledrive: ['File storage', 'Document sharing', 'Cloud operations', 'File sync'],
      googlesheets: ['Spreadsheet automation', 'Data analysis', 'Report generation', 'Data tracking'],
      telegram: ['Bot messages', 'Notifications', 'Chat automation', 'Instant messaging'],
      youtube: ['Video search', 'Content discovery', 'Video management', 'YouTube automation'],
      linkedin: ['Professional networking', 'Content sharing', 'Social automation', 'Lead generation'],
      x: ['Social media posting', 'Twitter automation', 'Content sharing', 'Social engagement']
    };
    return useCases[type] || [`${type} integration`, 'External service connection'];
  }

  private getBlockKeywords(type: string, name: string): string[] {
    const keywords: Record<string, string[]> = {
      agent: ['ai', 'chat', 'chatbot', 'conversation', 'generate', 'gpt', 'llm', 'gemini', 'claude'],
      api: ['fetch', 'request', 'http', 'rest', 'webhook', 'endpoint', 'service'],
      condition: ['if', 'check', 'validate', 'branch', 'route', 'logic', 'decision'],
      response: ['output', 'result', 'reply', 'send', 'return', 'respond'],
      function: ['transform', 'process', 'calculate', 'parse', 'format', 'convert'],
      
      slack: ['slack', 'team', 'notification', 'message', 'channel', 'workspace'],
      discord: ['discord', 'server', 'bot', 'community', 'gaming', 'chat'],
      gmail: ['email', 'mail', 'send', 'gmail', 'google', 'notification'],
      pinecone: ['vector', 'embedding', 'search', 'rag', 'similarity', 'semantic', 'knowledge'],
      notion: ['notes', 'database', 'workspace', 'documentation', 'wiki'],
      airtable: ['database', 'table', 'record', 'spreadsheet', 'crm'],
      github: ['code', 'repository', 'git', 'issue', 'pull request', 'ci/cd'],
      file: ['file', 'read', 'write', 'document', 'text', 'data'],
      openai: ['openai', 'gpt', 'ai', 'generate', 'completion'],
      googledrive: ['drive', 'file', 'storage', 'document', 'share'],
      googlesheets: ['sheet', 'spreadsheet', 'data', 'excel', 'table'],
      telegram: ['telegram', 'bot', 'message', 'notification'],
      youtube: ['youtube', 'video', 'search', 'content'],
      linkedin: ['linkedin', 'professional', 'network', 'business'],
      x: ['twitter', 'x', 'tweet', 'social', 'post'],
    };
    
    return [...(keywords[type] || []), type, name.toLowerCase()];
  }

  private analyzeWorkflowComplexity(userPrompt: string): 'simple' | 'moderate' | 'complex' {
    const lc = userPrompt.toLowerCase();
    
    // Simple workflows (2-3 blocks)
    if (lc.includes('chatbot') || lc.includes('simple') || lc.includes('basic') || 
        lc.includes('quick') || lc.includes('just') || lc.includes('only')) {
      return 'simple';
    }
    
    // Complex workflows (5-7 blocks)  
    if (lc.includes('comprehensive') || lc.includes('complete') || lc.includes('advanced') ||
        lc.includes('robust') || lc.includes('enterprise') || lc.includes('full-featured')) {
      return 'complex';
    }
    
    // Count complexity indicators
    const complexityIndicators = [
      'authenticate', 'validate', 'transform', 'store', 'email', 'notification', 
      'error handling', 'logging', 'database', 'integration', 'processing'
    ];
    const indicatorCount = complexityIndicators.filter(indicator => lc.includes(indicator)).length;
    
    return indicatorCount >= 4 ? 'complex' : 'moderate';
  }

  private analyzeUserIntent(userPrompt: string): string[] {
    const lc = userPrompt.toLowerCase();
    const allBlocks = this.getAllAvailableBlocks();
    const relevantBlocks: string[] = [];
    
    // Find blocks that match user keywords
    for (const block of allBlocks) {
      const score = block.keywords.filter(keyword => lc.includes(keyword)).length;
      if (score > 0) {
        relevantBlocks.push(`${block.type}:${score}`);
      }
    }
    
    // Sort by relevance score and return top matches
    return relevantBlocks
      .sort((a, b) => parseInt(b.split(':')[1]) - parseInt(a.split(':')[1]))
      .slice(0, 8)
      .map(item => item.split(':')[0]);
  }

  private createSystemPrompt(): string {
    const availableBlocks = this.getAllAvailableBlocks();
    const coreBlocks = availableBlocks.filter(b => 
      ['agent', 'api', 'condition', 'response', 'function'].includes(b.type)
    );
    const integrationBlocks = availableBlocks.filter(b => b.category === 'integrations').slice(0, 20);
    
    return `You are an AI workflow copilot for AGEN8. Create practical workflows using the EXACT block types available.

CORE WORKFLOW BLOCKS:
${coreBlocks.map(block => `
• ${block.name} (${block.type}): ${block.description}
  Keywords: ${block.keywords.slice(0, 4).join(', ')}
  Use for: ${block.useCases.join(', ')}
`).join('')}

POPULAR INTEGRATION BLOCKS:
${integrationBlocks.map(block => `
• ${block.name} (${block.type}): ${block.description}
  Keywords: ${block.keywords.slice(0, 3).join(', ')}
`).join('')}

WORKFLOW BUILDING RULES:
1. **Use EXACT block types**: Only use block types from the lists above
2. **Match user intent**: If user mentions "slack", use block type "slack", not "api"
3. **Logical flow**: Connect blocks in meaningful sequence
4. **Appropriate complexity**: Simple requests = 2-3 blocks, complex requests = 4-6 blocks

BLOCK SELECTION EXAMPLES:
• "chatbot with gemini" → agent (for AI) + response (for output)
• "rag with pinecone and slack" → file (read data) + pinecone (vector search) + agent (AI processing) + slack (notifications)
• "youtube analysis" → youtube (search videos) + agent (analyze) + response (results)
• "email automation" → gmail (send emails) + condition (logic) + response (confirmation)

JSON RESPONSE FORMAT:
{
  "description": "Clear workflow description",
  "blocks": [
    {
      "type": "exact_block_type_from_above_lists",
      "name": "Descriptive Block Name",
      "description": "What this block does in this workflow",
      "data": { "label": "Block Display Name" }
    }
  ],
  "connections": [
    { "from": "starter", "to": "first_block_name", "description": "Workflow starts here" },
    { "from": "first_block_name", "to": "next_block_name", "description": "Data flows here" }
  ]
}

CRITICAL: 
- NEVER create block types not in the lists above
- ALWAYS start connections from "starter"
- Use specific integration blocks (slack, pinecone, gmail) instead of generic "api"
- Match block types to user keywords exactly`;
  }

  async generateWorkflowPlan(userPrompt: string): Promise<WorkflowPlan> {
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI API is not configured. Please set up your API key.');
    }

    // Analyze user intent and suggest relevant blocks
    const relevantBlocks = this.analyzeUserIntent(userPrompt);
    const complexity = this.analyzeWorkflowComplexity(userPrompt);
    
    console.log(`🔍 User intent analysis - Relevant blocks:`, relevantBlocks);
    console.log(`🔍 Workflow complexity: ${complexity}`);

    const systemPrompt = this.createSystemPrompt();
    
    // Add intelligent guidance to the user prompt
    let enhancedPrompt = `${userPrompt}

INTELLIGENT ANALYSIS:
- Detected relevant blocks: ${relevantBlocks.slice(0, 5).join(', ')}
- Complexity level: ${complexity.toUpperCase()}

SPECIFIC GUIDANCE:`;
    
    switch (complexity) {
      case 'simple':
        enhancedPrompt += `
- Create a SIMPLE workflow (2-3 blocks)  
- Focus on core functionality only
- Example: ${relevantBlocks[0]} → response`;
        break;
      case 'moderate':
        enhancedPrompt += `
- Create a MODERATE workflow (3-5 blocks)
- Include essential processing steps
- Consider: ${relevantBlocks.slice(0, 3).join(' → ')}`;
        break;
      case 'complex':
        enhancedPrompt += `
- Design a COMPREHENSIVE workflow (4-6 blocks)
- Include error handling and validation  
- Suggested flow: ${relevantBlocks.slice(0, 4).join(' → ')}`;
        break;
    }
    
    enhancedPrompt += `

REMEMBER: Use EXACT block types from the available lists. If user mentions specific services (slack, pinecone, gmail), use those exact block types!`;
    
    const response = await openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: enhancedPrompt }
    ], {
      temperature: 0.1, // Very low temperature for consistent, practical results
      maxTokens: 1000, // Reduced for more focused responses
      model: 'gpt-4o-mini'
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

      // Smart field population - only fill safe fields, leave sensitive ones empty
      blockConfig.subBlocks?.forEach(subBlock => {
        if (!defaultData[subBlock.id]) {
          // Fields that should NEVER be auto-filled (user must configure)
          const sensitiveFields = [
            'apikey', 'api_key', 'key', 'token', 'secret', 'password', 'auth',
            'credential', 'bearer', 'oauth', 'jwt', 'private_key', 'client_secret'
          ];
          
          // Fields that should be left empty for user input
          const userInputFields = [
            'prompt', 'message', 'input', 'query', 'question', 'text', 'content',
            'url', 'endpoint', 'webhook', 'email', 'phone', 'address'
          ];
          
          const fieldId = subBlock.id.toLowerCase();
          const fieldTitle = (subBlock.title || '').toLowerCase();
          
          // Check if this is a sensitive field that should be left empty
          const isSensitive = sensitiveFields.some(sensitive => 
            fieldId.includes(sensitive) || fieldTitle.includes(sensitive)
          );
          
          // Check if this is a user input field that should be left empty
          const isUserInput = userInputFields.some(input => 
            fieldId.includes(input) || fieldTitle.includes(input)
          );
          
          // Only auto-fill safe, non-sensitive fields
          if (!isSensitive && !isUserInput) {
            switch (subBlock.type) {
              case 'toggle':
                defaultData[subBlock.id] = false;
                break;
              case 'number':
                // Only set default numbers for safe fields
                if (!fieldId.includes('port') && !fieldId.includes('timeout')) {
                  defaultData[subBlock.id] = 0;
                }
                break;
              case 'combobox': {
                const options = typeof subBlock.options === 'function' ? subBlock.options() : subBlock.options || [];
                // Only set default for model selection and similar safe dropdowns
                if (fieldId.includes('model') || fieldId.includes('provider') || fieldId.includes('method')) {
                  defaultData[subBlock.id] = options[0]?.id || '';
                }
                break;
              }
              // Don't auto-fill text inputs - let users configure them
            }
          }
          
          // For required fields that we didn't fill, set empty string to avoid errors
          if (subBlock.required && defaultData[subBlock.id] === undefined) {
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
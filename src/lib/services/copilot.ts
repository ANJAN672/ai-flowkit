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

interface WorkflowPattern {
  name: string;
  keywords: string[];
  blocks: string[];
  description: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

interface IntentAnalysis {
  primaryIntent: string;
  entities: string[];
  patterns: WorkflowPattern[];
  suggestedBlocks: string[];
  confidence: number;
}

export class CopilotService {
  private workflowPatterns: WorkflowPattern[] = [
    // Communication Patterns
    {
      name: 'WhatsApp Chatbot',
      keywords: ['whatsapp', 'chat', 'chatbot', 'conversation', 'message'],
      blocks: ['whatsapp', 'agent', 'whatsapp'],
      description: 'Bidirectional chat through WhatsApp',
      complexity: 'simple'
    },
    {
      name: 'Slack Bot',
      keywords: ['slack', 'bot', 'notification', 'team', 'channel'],
      blocks: ['slack', 'agent', 'slack'],
      description: 'Interactive Slack bot',
      complexity: 'simple'
    },
    {
      name: 'Email Automation',
      keywords: ['email', 'gmail', 'mail', 'send', 'automation'],
      blocks: ['gmail', 'condition', 'response'],
      description: 'Email processing and automation',
      complexity: 'moderate'
    },
    
    // AI & RAG Patterns
    {
      name: 'RAG System',
      keywords: ['rag', 'retrieval', 'knowledge', 'vector', 'search'],
      blocks: ['file', 'pinecone', 'agent', 'response'],
      description: 'Retrieval-Augmented Generation system',
      complexity: 'complex'
    },
    {
      name: 'RAG with Notifications',
      keywords: ['rag', 'notify', 'alert', 'slack', 'whatsapp'],
      blocks: ['file', 'pinecone', 'agent', 'slack'],
      description: 'RAG system with notifications',
      complexity: 'complex'
    },
    {
      name: 'Simple Chatbot',
      keywords: ['chatbot', 'ai', 'assistant', 'basic', 'simple'],
      blocks: ['agent', 'response'],
      description: 'Basic AI chatbot',
      complexity: 'simple'
    },
    
    // Data Processing Patterns
    {
      name: 'File Analysis',
      keywords: ['file', 'analyze', 'process', 'document', 'text'],
      blocks: ['file', 'function', 'agent', 'response'],
      description: 'File processing and analysis',
      complexity: 'moderate'
    },
    {
      name: 'API Integration',
      keywords: ['api', 'fetch', 'data', 'integration', 'external'],
      blocks: ['api', 'function', 'condition', 'response'],
      description: 'API data processing',
      complexity: 'moderate'
    },
    {
      name: 'Content Generation',
      keywords: ['generate', 'create', 'content', 'write', 'ai'],
      blocks: ['agent', 'function', 'response'],
      description: 'AI content generation',
      complexity: 'moderate'
    },
    
    // Social Media Patterns
    {
      name: 'YouTube Analysis',
      keywords: ['youtube', 'video', 'analyze', 'search', 'content'],
      blocks: ['youtube', 'agent', 'response'],
      description: 'YouTube video analysis',
      complexity: 'moderate'
    },
    {
      name: 'Social Media Automation',
      keywords: ['social', 'twitter', 'x', 'linkedin', 'post'],
      blocks: ['agent', 'x', 'response'],
      description: 'Social media posting automation',
      complexity: 'moderate'
    },
    
    // Database Patterns
    {
      name: 'Database Operations',
      keywords: ['database', 'store', 'save', 'query', 'airtable'],
      blocks: ['airtable', 'function', 'condition', 'response'],
      description: 'Database operations workflow',
      complexity: 'moderate'
    },
    {
      name: 'Spreadsheet Automation',
      keywords: ['sheet', 'excel', 'spreadsheet', 'data', 'google'],
      blocks: ['googlesheets', 'function', 'response'],
      description: 'Spreadsheet automation',
      complexity: 'moderate'
    },
    
    // Complex Multi-step Patterns
    {
      name: 'Research Assistant',
      keywords: ['research', 'find', 'search', 'information', 'knowledge'],
      blocks: ['api', 'agent', 'pinecone', 'response'],
      description: 'AI research assistant',
      complexity: 'complex'
    },
    {
      name: 'Customer Support',
      keywords: ['support', 'help', 'customer', 'ticket', 'assist'],
      blocks: ['agent', 'condition', 'slack', 'gmail'],
      description: 'Customer support workflow',
      complexity: 'complex'
    },
    {
      name: 'Data Pipeline',
      keywords: ['pipeline', 'etl', 'transform', 'process', 'workflow'],
      blocks: ['file', 'function', 'condition', 'api', 'response'],
      description: 'Data processing pipeline',
      complexity: 'complex'
    }
  ];

  private getAvailableBlocks() {
    return getAllBlocks()
      .filter(block => block.type !== 'starter')
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
      pinecone: ['vector', 'embedding', 'search', 'rag', 'similarity', 'semantic', 'knowledge', 'vectordb', 'database'],
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
      whatsapp: ['whatsapp', 'whats app', 'wa', 'message', 'chat'],
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

  private analyzeUserIntent(userPrompt: string): IntentAnalysis {
    const lc = userPrompt.toLowerCase();
    const words = lc.split(' ');
    
    // Analyze against workflow patterns
    const patternMatches = this.workflowPatterns.map(pattern => {
      const matchingKeywords = pattern.keywords.filter(keyword => 
        lc.includes(keyword.toLowerCase())
      );
      const score = matchingKeywords.length;
      const confidence = score / pattern.keywords.length;
      
      return {
        pattern,
        score,
        confidence,
        matchingKeywords
      };
    }).filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score);

    // Extract entities (services, tools, platforms mentioned)
    const entities = this.extractEntities(lc);
    
    // Determine primary intent
    let primaryIntent = 'general_automation';
    if (patternMatches.length > 0) {
      primaryIntent = patternMatches[0].pattern.name.toLowerCase().replace(' ', '_');
    }
    
    // Get matching patterns (top 3)
    const patterns = patternMatches.slice(0, 3).map(match => match.pattern);
    
    // Smart block suggestion based on patterns and entities
    let suggestedBlocks: string[] = [];
    if (patterns.length > 0) {
      suggestedBlocks = patterns[0].blocks;
      
      // Enhance based on entities
      entities.forEach(entity => {
        if (!suggestedBlocks.includes(entity)) {
          suggestedBlocks.push(entity);
        }
      });
    } else {
      // Fallback: use entity-based analysis
      suggestedBlocks = this.fallbackBlockAnalysis(lc, entities);
    }
    
    return {
      primaryIntent,
      entities,
      patterns,
      suggestedBlocks: suggestedBlocks.slice(0, 6),
      confidence: patternMatches[0]?.confidence || 0.5
    };
  }

  private extractEntities(prompt: string): string[] {
    const entityMap: Record<string, string> = {
      // Communication platforms
      'whatsapp': 'whatsapp',
      'whats app': 'whatsapp',
      'wa': 'whatsapp',
      'slack': 'slack',
      'discord': 'discord',
      'telegram': 'telegram',
      
      // Email services  
      'gmail': 'gmail',
      'email': 'gmail',
      'mail': 'gmail',
      'outlook': 'outlook',
      
      // AI services
      'openai': 'openai',
      'gpt': 'openai',
      'gemini': 'openai',
      'claude': 'openai',
      
      // Vector databases
      'pinecone': 'pinecone',
      'vector': 'pinecone',
      'qdrant': 'qdrant',
      'vectordb': 'pinecone',
      
      // Social media
      'youtube': 'youtube',
      'twitter': 'x',
      'x.com': 'x',
      'linkedin': 'linkedin',
      
      // Productivity
      'notion': 'notion',
      'airtable': 'airtable',
      'sheets': 'googlesheets',
      'excel': 'googlesheets',
      'drive': 'googledrive',
      
      // Development
      'github': 'github',
      'git': 'github',
      'api': 'api',
      'webhook': 'api',
      
      // File operations
      'file': 'file',
      'document': 'file',
      'pdf': 'file',
      'text': 'file'
    };

    const entities: string[] = [];
    
    Object.keys(entityMap).forEach(keyword => {
      if (prompt.includes(keyword)) {
        const blockType = entityMap[keyword];
        if (!entities.includes(blockType)) {
          entities.push(blockType);
        }
      }
    });

    return entities;
  }

  private fallbackBlockAnalysis(prompt: string, entities: string[]): string[] {
    const blocks: string[] = [...entities];
    
    // Add core workflow blocks based on intent
    if (prompt.includes('chat') || prompt.includes('bot') || prompt.includes('conversation')) {
      if (!blocks.includes('agent')) blocks.push('agent');
    }
    
    if (prompt.includes('analyze') || prompt.includes('process') || prompt.includes('transform')) {
      if (!blocks.includes('function')) blocks.push('function');
      if (!blocks.includes('agent')) blocks.push('agent');
    }
    
    if (prompt.includes('condition') || prompt.includes('if') || prompt.includes('check')) {
      if (!blocks.includes('condition')) blocks.push('condition');
    }
    
    if (prompt.includes('notify') || prompt.includes('send') || prompt.includes('alert')) {
      if (entities.some(e => ['whatsapp', 'slack', 'discord', 'gmail'].includes(e))) {
        // Already have notification blocks from entities
      } else {
        blocks.push('slack'); // Default notification
      }
    }
    
    // Always add response for output
    if (!blocks.some(b => ['response', 'whatsapp', 'slack', 'gmail', 'discord'].includes(b))) {
      blocks.push('response');
    }
    
    return blocks;
  }

  private validateAndCorrectBlockTypes(plan: WorkflowPlan, userPrompt: string): WorkflowPlan {
    const availableBlockTypes = getAllBlocks().map(b => b.type);
    const correctionMap: Record<string, string> = {
      // Common AI mistakes → Correct block types
      'ai_chatbot': 'agent',
      'ai chatbot': 'agent', 
      'chatbot': 'agent',
      'ai_agent': 'agent',
      'ai agent': 'agent',
      'llm': 'agent',
      'gpt': 'agent',
      'gemini': 'agent',
      'claude': 'agent',
      'user interaction agent': 'agent',
      'user_interaction_agent': 'agent',
      'interaction agent': 'agent',
      'chatbot agent': 'agent',
      
      'vector_database': 'pinecone',
      'vector database': 'pinecone',
      'vector_search': 'pinecone',
      'vector search': 'pinecone',
      'vectordb': 'pinecone',
      'vector_db': 'pinecone',
      'vector db': 'pinecone',
      'database_query': 'pinecone',
      'database query': 'pinecone',
      'vector_database_query': 'pinecone',
      'vector database query': 'pinecone',
      
      // WhatsApp corrections
      'whatsapp_notification': 'whatsapp',
      'whatsapp notification': 'whatsapp',
      'whatsapp_message': 'whatsapp',
      'whatsapp message': 'whatsapp',
      'send_whatsapp': 'whatsapp',
      'send whatsapp': 'whatsapp',
      'whatsapp integration': 'whatsapp',
      'whatsapp_integration': 'whatsapp',
      
      'slack_notification': 'slack',
      'slack notification': 'slack',
      'slack notification block': 'slack',
      'slack_notification_block': 'slack',
      'send_notification': 'slack',
      'send notification': 'slack',
      'notification': 'whatsapp', // Default notification to whatsapp if mentioned
      'notify': 'whatsapp',
      'alert': 'slack',
      'send_message': 'slack',
      'send message': 'slack',
      'message': 'slack',
      
      'email_notification': 'gmail',
      'email notification': 'gmail',
      'send_email': 'gmail',
      'send email': 'gmail',
      'email': 'gmail',
      'mail': 'gmail',
      
      'file_reader': 'file',
      'file reader': 'file',
      'read_file': 'file',
      'read file': 'file',
      'file_input': 'file',
      'file input': 'file',
      'data_input': 'file',
      'data input': 'file',
      
      'http_request': 'api',
      'http request': 'api',
      'rest_api': 'api',
      'rest api': 'api',
      'web_request': 'api',
      'web request': 'api',
      'fetch_data': 'api',
      'fetch data': 'api',
      
      'condition_check': 'condition',
      'condition check': 'condition',
      'if_condition': 'condition',
      'if condition': 'condition',
      'branch': 'condition',
      'decision': 'condition',
      'logic': 'condition',
      
      'output': 'response',
      'result': 'response',
      'send_response': 'response',
      'send response': 'response',
      'user response': 'response',
      'user_response': 'response',
      'reply': 'response',
      'return': 'response',
      'final_output': 'response',
      'final output': 'response',
      
      'data_processing': 'function',
      'data processing': 'function',
      'transform': 'function',
      'process': 'function',
      'parse': 'function',
      'format': 'function'
    };

    console.log('🔍 Validating block types...');
    
    const correctedBlocks = plan.blocks.map((block, index) => {
      const originalType = block.type.toLowerCase().trim();
      
      // Check if the block type exists in registry
      if (availableBlockTypes.includes(originalType)) {
        console.log(`✅ Block ${index + 1}: "${originalType}" - Valid`);
        return { ...block, type: originalType };
      }
      
      // Try to find a correction
      let correctedType = correctionMap[originalType];
      
      // If no direct correction, try fuzzy matching with keywords
      if (!correctedType) {
        const lc = userPrompt.toLowerCase();
        
        // Smart keyword matching based on user input
        if (originalType.includes('vector') || originalType.includes('database') || originalType.includes('pinecone')) {
          if (lc.includes('pinecone')) correctedType = 'pinecone';
          else if (lc.includes('qdrant')) correctedType = 'qdrant'; 
          else correctedType = 'pinecone'; // default vector db
        }
        else if (originalType.includes('whatsapp') || (originalType.includes('notification') && lc.includes('whatsapp'))) {
          correctedType = 'whatsapp';
        }
        else if (originalType.includes('slack') || originalType.includes('notification')) {
          if (lc.includes('whatsapp')) correctedType = 'whatsapp';
          else if (lc.includes('slack')) correctedType = 'slack';
          else if (lc.includes('discord')) correctedType = 'discord';
          else if (lc.includes('telegram')) correctedType = 'telegram';
          else correctedType = 'slack'; // default notification
        }
        else if (originalType.includes('email') || originalType.includes('mail')) {
          if (lc.includes('gmail')) correctedType = 'gmail';
          else if (lc.includes('outlook')) correctedType = 'outlook';
          else correctedType = 'gmail'; // default email
        }
        else if (originalType.includes('ai') || originalType.includes('chat') || originalType.includes('agent')) {
          correctedType = 'agent';
        }
        else if (originalType.includes('file') || originalType.includes('read') || originalType.includes('input')) {
          correctedType = 'file';
        }
        else if (originalType.includes('condition') || originalType.includes('if') || originalType.includes('check')) {
          correctedType = 'condition';
        }
        else if (originalType.includes('response') || originalType.includes('output') || originalType.includes('result')) {
          correctedType = 'response';
        }
        else if (originalType.includes('api') || originalType.includes('http') || originalType.includes('request')) {
          correctedType = 'api';
        }
        else if (originalType.includes('function') || originalType.includes('process') || originalType.includes('transform')) {
          correctedType = 'function';
        }
        else {
          // Last resort: default to agent for AI-related tasks
          correctedType = 'agent';
        }
      }
      
      console.log(`🔧 Block ${index + 1}: "${originalType}" → "${correctedType}" (${availableBlockTypes.includes(correctedType) ? 'Valid' : 'STILL INVALID!'})`);
      
      return {
        ...block,
        type: correctedType,
        name: block.name || `${correctedType} Block`
      };
    });
    
    return {
      ...plan,
      blocks: correctedBlocks
    };
  }

  private createSystemPrompt(analysis: IntentAnalysis): string {
    const availableTypes = getAllBlocks().filter(b => b.type !== 'starter').map(b => b.type);
    
    return `You are an expert workflow architect. Create a workflow using ONLY these exact block types: ${availableTypes.join(', ')}

ANALYZED USER INTENT:
- Primary Intent: ${analysis.primaryIntent}
- Confidence: ${(analysis.confidence * 100).toFixed(0)}%
- Detected Entities: ${analysis.entities.join(', ') || 'none'}
- Suggested Blocks: ${analysis.suggestedBlocks.join(', ')}
- Matching Patterns: ${analysis.patterns.map(p => p.name).join(', ') || 'custom workflow'}

WORKFLOW PATTERNS DATABASE:
${this.workflowPatterns.map(pattern => 
  `• ${pattern.name}: ${pattern.blocks.join(' → ')} (${pattern.complexity})`
).join('\n')}

SMART WORKFLOW RULES:
1. Use the suggested blocks from analysis: ${analysis.suggestedBlocks.join(', ')}
2. Follow logical flow: input → processing → output
3. For bidirectional communication (WhatsApp, Slack): use block twice (input & output)
4. For RAG workflows: file → pinecone → agent → (notification/response)
5. For API workflows: api → function → condition → response
6. Always connect from "starter" to first block

PERFECT EXAMPLES:
WhatsApp Chatbot: [{"type":"whatsapp","name":"Receive Message"}, {"type":"agent","name":"AI Agent"}, {"type":"whatsapp","name":"Send Reply"}]
RAG + Slack: [{"type":"file","name":"Load Data"}, {"type":"pinecone","name":"Vector Search"}, {"type":"agent","name":"AI Process"}, {"type":"slack","name":"Send to Slack"}]
YouTube Analysis: [{"type":"youtube","name":"Search Videos"}, {"type":"agent","name":"Analyze Content"}, {"type":"response","name":"Return Results"}]

JSON RESPONSE FORMAT:
{
  "description": "Clear workflow description based on user intent",
  "blocks": [
    {"type": "exact_block_type", "name": "Descriptive Name", "description": "What this block does", "data": {"label": "Display Name"}}
  ],
  "connections": [
    {"from": "starter", "to": "first_block_name", "description": "Workflow starts"},
    {"from": "first_block_name", "to": "second_block_name", "description": "Data flows"}
  ]
}

CRITICAL: Use ONLY block types from this list: ${availableTypes.join(', ')}
Never create fake types like "User Interaction Agent" or "WhatsApp Integration"!`;
  }

  async generateWorkflowPlan(userPrompt: string): Promise<WorkflowPlan> {
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI API is not configured. Please set up your API key.');
    }

    // Comprehensive intent analysis using the new system
    const analysis = this.analyzeUserIntent(userPrompt);
    const complexity = this.analyzeWorkflowComplexity(userPrompt);
    
    console.log(`🧠 Intent Analysis:`, {
      primaryIntent: analysis.primaryIntent,
      entities: analysis.entities,
      patterns: analysis.patterns.map(p => p.name),
      suggestedBlocks: analysis.suggestedBlocks,
      confidence: analysis.confidence
    });
    console.log(`🔍 Workflow complexity: ${complexity}`);

    const systemPrompt = this.createSystemPrompt(analysis);
    
    // Build intelligent prompt based on analysis
    const bestPattern = analysis.patterns[0];
    let smartPrompt = `${userPrompt}

INTELLIGENT ANALYSIS RESULTS:
✅ Detected Intent: ${analysis.primaryIntent} (${(analysis.confidence * 100).toFixed(0)}% confidence)
✅ Identified Services: ${analysis.entities.join(', ') || 'none specific'}
✅ Best Matching Pattern: ${bestPattern?.name || 'Custom workflow'}
✅ Recommended Blocks: ${analysis.suggestedBlocks.join(' → ')}
✅ Complexity Level: ${complexity}

PRECISE INSTRUCTIONS:
Create a ${complexity} workflow using these EXACT block types: ${analysis.suggestedBlocks.join(', ')}`;

    if (bestPattern) {
      smartPrompt += `\nFollow this proven pattern: ${bestPattern.blocks.join(' → ')}`;
      smartPrompt += `\nPattern description: ${bestPattern.description}`;
    }

    smartPrompt += `\n\nGenerate the JSON workflow now using ONLY the suggested blocks!`;
    
    const response = await openaiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: smartPrompt }
    ], {
      temperature: 0.0, // Zero temperature for maximum consistency
      maxTokens: 1000, // Enough for complex workflows
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

      let plan = JSON.parse(jsonMatch[0]) as WorkflowPlan;
      
      console.log('🤖 AI Generated Plan (raw):', plan);
      console.log('📦 Blocks in plan (raw):', plan.blocks?.map(b => `${b.name} (${b.type})`));
      
      // Validate the plan structure
      if (!plan.blocks || !Array.isArray(plan.blocks)) {
        throw new Error('Invalid workflow plan: missing blocks array');
      }

      // FIX INVALID BLOCK TYPES - This is critical!
      plan = this.validateAndCorrectBlockTypes(plan, userPrompt);
      
      console.log('✅ Corrected Plan:', plan);
      console.log('✅ Final blocks:', plan.blocks?.map(b => `${b.name} (${b.type})`));

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
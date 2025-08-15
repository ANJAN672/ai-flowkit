import { Plug, Database, FileText, Bot, Mail, Calendar, Users, Github, Search, Image, Phone, MessageSquare, Globe, Video, Zap } from 'lucide-react';
import { BlockConfig } from '../../types';

// Common integration configuration
const createIntegrationBlock = (
  type: string,
  name: string,
  description: string,
  icon = Plug,
  additionalFields: Array<{
    id: string;
    title: string;
    type: 'short-input' | 'long-input' | 'code' | 'slider' | 'combobox' | 'tool-input' | 'toggle' | 'number';
    layout: 'full' | 'half';
    placeholder?: string;
    required?: boolean;
    options?: () => Array<{ id: string; label: string }>;
    rows?: number;
    language?: 'json' | 'typescript' | 'javascript' | 'text';
  }> = []
): BlockConfig => ({
  type,
  name,
  description,
  category: 'integrations',
  bgColor: '#06b6d4', // Light blue for integrations
  icon: icon as unknown as React.FC<{ size?: number }>,
  subBlocks: [
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      layout: 'full',
      password: true,
      placeholder: `Enter your ${name} API key`,
      required: true
    },
    {
      id: 'endpoint',
      title: 'Endpoint URL',
      type: 'short-input',
      layout: 'full',
      placeholder: `${name} API endpoint (optional)`
    },
    ...additionalFields
  ],
  inputs: {
    apiKey: { type: 'string', description: 'API key for authentication' },
    endpoint: { type: 'string', description: 'Custom endpoint URL' }
  },
  outputs: {
    data: { type: 'json', description: 'Response data from the service' },
    status: { type: 'string', description: 'Request status' }
  },
  async run(ctx) {
    const { apiKey } = ctx.inputs as { apiKey?: unknown };
    
    if (!apiKey) {
      throw new Error(`${name} API key is required`);
    }
    
    ctx.log(`Executing ${name} integration`);
    
    // Mock response for now
  const result = {
      data: { message: `${name} integration executed successfully` },
      status: 'success'
    };
    
    ctx.setNodeOutput('data', result.data);
    ctx.setNodeOutput('status', result.status);
    
    return result;
  }
});

// Define all integration blocks
export const airtableBlock = createIntegrationBlock(
  'airtable',
  'Airtable',
  'Connect to Airtable bases and tables',
  Database,
  [
    {
      id: 'baseId',
      title: 'Base ID',
      type: 'short-input',
      layout: 'half',
      placeholder: 'app1234567890',
      required: true
    },
    {
      id: 'tableId',
      title: 'Table ID',
      type: 'short-input',
      layout: 'half',
      placeholder: 'tbl1234567890',
      required: true
    }
  ]
);

export const arxivBlock = createIntegrationBlock(
  'arxiv',
  'ArXiv',
  'Search and retrieve academic papers from ArXiv',
  FileText,
  [
    {
      id: 'query',
      title: 'Search Query',
      type: 'short-input',
      layout: 'full',
      placeholder: 'machine learning',
      required: true
    },
    {
      id: 'maxResults',
      title: 'Max Results',
      type: 'short-input',
      layout: 'half',
      placeholder: '10'
    }
  ]
);

export const browserUseBlock = createIntegrationBlock(
  'browseruse',
  'BrowserUse',
  'Automate browser interactions and web scraping',
  Globe
);

export const clayBlock = createIntegrationBlock(
  'clay',
  'Clay',
  'Connect to Clay for data enrichment and workflows',
  Database
);

export const confluenceBlock = createIntegrationBlock(
  'confluence',
  'Confluence',
  'Access and manage Confluence pages and spaces',
  FileText,
  [
    {
      id: 'domain',
      title: 'Confluence Domain',
      type: 'short-input',
      layout: 'full',
      placeholder: 'your-domain.atlassian.net',
      required: true
    }
  ]
);

export const discordBlock = createIntegrationBlock(
  'discord',
  'Discord',
  'Send messages and manage Discord servers',
  MessageSquare,
  [
    {
      id: 'webhookUrl',
      title: 'Webhook URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Discord webhook URL'
    }
  ]
);

export const elevenLabsBlock = createIntegrationBlock(
  'elevenlabs',
  'ElevenLabs',
  'Generate speech with AI voices',
  Bot,
  [
    {
      id: 'voiceId',
      title: 'Voice ID',
      type: 'short-input',
      layout: 'half',
      placeholder: '21m00Tcm4TlvDq8ikWAM'
    },
    {
      id: 'model',
      title: 'Model',
      type: 'combobox',
      layout: 'half',
      options: () => [
        { id: 'eleven_multilingual_v2', label: 'Multilingual v2' },
        { id: 'eleven_turbo_v2_5', label: 'Turbo v2.5' }
      ]
    }
  ]
);

export const exaBlock = createIntegrationBlock(
  'exa',
  'Exa',
  'Search the web with AI-powered search engine',
  Search
);

export const fileBlock = createIntegrationBlock(
  'file',
  'File',
  'Read and write files from various sources',
  FileText,
  [
    {
      id: 'filePath',
      title: 'File Path',
      type: 'short-input',
      layout: 'full',
      placeholder: '/path/to/file.txt',
      required: true
    },
    {
      id: 'operation',
      title: 'Operation',
      type: 'combobox',
      layout: 'half',
      options: () => [
        { id: 'read', label: 'Read' },
        { id: 'write', label: 'Write' },
        { id: 'append', label: 'Append' }
      ]
    }
  ]
);

export const firecrawlBlock = createIntegrationBlock(
  'firecrawl',
  'Firecrawl',
  'Scrape and crawl websites with AI',
  Globe,
  [
    {
      id: 'url',
      title: 'URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'https://example.com',
      required: true
    }
  ]
);

export const githubBlock = createIntegrationBlock(
  'github',
  'GitHub',
  'Interact with GitHub repositories and issues',
  Github,
  [
    {
      id: 'repository',
      title: 'Repository',
      type: 'short-input',
      layout: 'full',
      placeholder: 'owner/repo',
      required: true
    }
  ]
);

export const gmailBlock = createIntegrationBlock(
  'gmail',
  'Gmail',
  'Send and manage Gmail emails',
  Mail,
  [
    {
      id: 'to',
      title: 'To',
      type: 'short-input',
      layout: 'full',
      placeholder: 'recipient@example.com'
    },
    {
      id: 'subject',
      title: 'Subject',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Email subject'
    },
    {
      id: 'body',
      title: 'Body',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Email content...',
      rows: 4
    }
  ]
);

export const googleBlock = createIntegrationBlock(
  'google',
  'Google',
  'Access Google services and APIs',
  Search
);

export const googleCalendarBlock = createIntegrationBlock(
  'googlecalendar',
  'Google Calendar',
  'Manage Google Calendar events',
  Calendar,
  [
    {
      id: 'calendarId',
      title: 'Calendar ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'primary'
    }
  ]
);

export const googleDocsBlock = createIntegrationBlock(
  'googledocs',
  'Google Docs',
  'Create and edit Google Docs',
  FileText
);

export const googleDriveBlock = createIntegrationBlock(
  'googledrive',
  'Google Drive',
  'Access and manage Google Drive files',
  Database
);

export const googleSheetsBlock = createIntegrationBlock(
  'googlesheets',
  'Google Sheets',
  'Read and write Google Sheets data',
  Database,
  [
    {
      id: 'spreadsheetId',
      title: 'Spreadsheet ID',
      type: 'short-input',
      layout: 'full',
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      required: true
    },
    {
      id: 'range',
      title: 'Range',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Sheet1!A1:D10'
    }
  ]
);

export const huggingFaceBlock = createIntegrationBlock(
  'huggingface',
  'HuggingFace',
  'Access HuggingFace models and datasets',
  Bot,
  [
    {
      id: 'model',
      title: 'Model',
      type: 'short-input',
      layout: 'full',
      placeholder: 'gpt2',
      required: true
    }
  ]
);

export const hunterBlock = createIntegrationBlock(
  'hunter',
  'Hunter',
  'Find email addresses with Hunter.io',
  Search,
  [
    {
      id: 'domain',
      title: 'Domain',
      type: 'short-input',
      layout: 'full',
      placeholder: 'example.com',
      required: true
    }
  ]
);

export const imageGeneratorBlock = createIntegrationBlock(
  'imagegenerator',
  'Image Generator',
  'Generate images with AI',
  Image,
  [
    {
      id: 'prompt',
      title: 'Prompt',
      type: 'long-input',
      layout: 'full',
      placeholder: 'A beautiful sunset over mountains',
      rows: 3,
      required: true
    },
    {
      id: 'size',
      title: 'Size',
      type: 'combobox',
      layout: 'half',
      options: () => [
        { id: '1024x1024', label: '1024×1024' },
        { id: '1792x1024', label: '1792×1024' },
        { id: '1024x1792', label: '1024×1792' }
      ]
    }
  ]
);

export const jinaBlock = createIntegrationBlock(
  'jina',
  'Jina',
  'Use Jina AI for embeddings and search',
  Bot
);

export const jiraBlock = createIntegrationBlock(
  'jira',
  'Jira',
  'Manage Jira issues and projects',
  Zap,
  [
    {
      id: 'domain',
      title: 'Jira Domain',
      type: 'short-input',
      layout: 'full',
      placeholder: 'your-domain.atlassian.net',
      required: true
    },
    {
      id: 'projectKey',
      title: 'Project Key',
      type: 'short-input',
      layout: 'half',
      placeholder: 'PROJ'
    }
  ]
);

export const linearBlock = createIntegrationBlock(
  'linear',
  'Linear',
  'Create and manage Linear issues',
  Zap,
  [
    {
      id: 'teamId',
      title: 'Team ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'team_123456789'
    }
  ]
);

export const linkupBlock = createIntegrationBlock(
  'linkup',
  'Linkup',
  'Connect and manage professional networks',
  Users
);

export const mem0Block = createIntegrationBlock(
  'mem0',
  'Mem0',
  'Store and retrieve AI memories',
  Database,
  [
    {
      id: 'userId',
      title: 'User ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'user_123'
    }
  ]
);

export const microsoftExcelBlock = createIntegrationBlock(
  'microsoftexcel',
  'Microsoft Excel',
  'Read and write Excel spreadsheets',
  Database
);

export const microsoftPlannerBlock = createIntegrationBlock(
  'microsoftplanner',
  'Microsoft Planner',
  'Manage Microsoft Planner tasks',
  Calendar
);

export const microsoftTeamsBlock = createIntegrationBlock(
  'microsoftteams',
  'Microsoft Teams',
  'Send messages and manage Teams',
  MessageSquare
);

export const mistralParseBlock = createIntegrationBlock(
  'mistralparse',
  'Mistral Parse',
  'Parse documents with Mistral AI',
  FileText
);

export const notionBlock = createIntegrationBlock(
  'notion',
  'Notion',
  'Read and write Notion pages and databases',
  Database,
  [
    {
      id: 'databaseId',
      title: 'Database ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'notion-database-id'
    }
  ]
);

export const oneDriveBlock = createIntegrationBlock(
  'onedrive',
  'OneDrive',
  'Access and manage OneDrive files',
  Database
);

export const openAIBlock = createIntegrationBlock(
  'openai',
  'OpenAI',
  'Access OpenAI models and APIs',
  Bot,
  [
    {
      id: 'model',
      title: 'Model',
      type: 'combobox',
      layout: 'full',
      options: () => [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ]
    }
  ]
);

export const outlookBlock = createIntegrationBlock(
  'outlook',
  'Outlook',
  'Send and manage Outlook emails',
  Mail
);

export const perplexityBlock = createIntegrationBlock(
  'perplexity',
  'Perplexity',
  'Search with Perplexity AI',
  Search
);

export const pineconeBlock = createIntegrationBlock(
  'pinecone',
  'Pinecone',
  'Store and query vector embeddings',
  Database,
  [
    {
      id: 'index',
      title: 'Index Name',
      type: 'short-input',
      layout: 'full',
      placeholder: 'my-index',
      required: true
    }
  ]
);

export const qdrantBlock = createIntegrationBlock(
  'qdrant',
  'Qdrant',
  'Vector database for AI applications',
  Database
);

export const redditBlock = createIntegrationBlock(
  'reddit',
  'Reddit',
  'Access Reddit posts and comments',
  MessageSquare,
  [
    {
      id: 'subreddit',
      title: 'Subreddit',
      type: 'short-input',
      layout: 'full',
      placeholder: 'programming'
    }
  ]
);

export const s3Block = createIntegrationBlock(
  's3',
  'AWS S3',
  'Store and retrieve files from Amazon S3',
  Database,
  [
    {
      id: 'bucket',
      title: 'Bucket Name',
      type: 'short-input',
      layout: 'full',
      placeholder: 'my-bucket',
      required: true
    },
    {
      id: 'region',
      title: 'Region',
      type: 'short-input',
      layout: 'half',
      placeholder: 'us-east-1'
    }
  ]
);

export const serperBlock = createIntegrationBlock(
  'serper',
  'Serper',
  'Google search API integration',
  Search
);

export const sharePointBlock = createIntegrationBlock(
  'sharepoint',
  'SharePoint',
  'Access SharePoint sites and documents',
  Database
);

export const slackBlock = createIntegrationBlock(
  'slack',
  'Slack',
  'Send messages and manage Slack workspaces',
  MessageSquare,
  [
    {
      id: 'channel',
      title: 'Channel',
      type: 'short-input',
      layout: 'full',
      placeholder: '#general'
    }
  ]
);

export const stagehandBlock = createIntegrationBlock(
  'stagehand',
  'Stagehand',
  'Browser automation with AI',
  Globe
);

export const stagehandAgentBlock = createIntegrationBlock(
  'stagehandagent',
  'Stagehand Agent',
  'AI-powered browser automation agent',
  Bot
);

export const supabaseBlock = createIntegrationBlock(
  'supabase',
  'Supabase',
  'Interact with Supabase database and auth',
  Database,
  [
    {
      id: 'table',
      title: 'Table',
      type: 'short-input',
      layout: 'full',
      placeholder: 'users',
      required: true
    },
    {
      id: 'operation',
      title: 'Operation',
      type: 'combobox',
      layout: 'half',
      options: () => [
        { id: 'select', label: 'Select' },
        { id: 'insert', label: 'Insert' },
        { id: 'update', label: 'Update' },
        { id: 'delete', label: 'Delete' }
      ]
    }
  ]
);

export const tavilyBlock = createIntegrationBlock(
  'tavily',
  'Tavily',
  'AI-powered web search and research',
  Search
);

export const telegramBlock = createIntegrationBlock(
  'telegram',
  'Telegram',
  'Send messages via Telegram bot',
  MessageSquare,
  [
    {
      id: 'chatId',
      title: 'Chat ID',
      type: 'short-input',
      layout: 'full',
      placeholder: '123456789'
    }
  ]
);

export const thinkingBlock = createIntegrationBlock(
  'thinking',
  'Thinking',
  'AI reasoning and thought processes',
  Bot
);

export const translateBlock = createIntegrationBlock(
  'translate',
  'Translate',
  'Translate text between languages',
  Globe,
  [
    {
      id: 'targetLanguage',
      title: 'Target Language',
      type: 'short-input',
      layout: 'half',
      placeholder: 'es',
      required: true
    },
    {
      id: 'text',
      title: 'Text to Translate',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Hello, world!',
      rows: 3,
      required: true
    }
  ]
);

export const twilioBlock = createIntegrationBlock(
  'twilio',
  'Twilio',
  'Send SMS and make calls with Twilio',
  Phone,
  [
    {
      id: 'phoneNumber',
      title: 'To Phone Number',
      type: 'short-input',
      layout: 'full',
      placeholder: '+1234567890'
    },
    {
      id: 'message',
      title: 'Message',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Your message here...',
      rows: 3
    }
  ]
);

export const typeformBlock = createIntegrationBlock(
  'typeform',
  'Typeform',
  'Create and manage Typeform surveys',
  FileText
);

export const visionBlock = createIntegrationBlock(
  'vision',
  'Vision',
  'Analyze images with AI vision models',
  Image,
  [
    {
      id: 'imageUrl',
      title: 'Image URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'https://example.com/image.jpg',
      required: true
    },
    {
      id: 'prompt',
      title: 'Analysis Prompt',
      type: 'long-input',
      layout: 'full',
      placeholder: 'What do you see in this image?',
      rows: 3
    }
  ]
);

export const wealthboxBlock = createIntegrationBlock(
  'wealthbox',
  'Wealthbox',
  'Manage Wealthbox CRM data',
  Users
);

export const webhookBlock = createIntegrationBlock(
  'webhook',
  'Webhook',
  'Send HTTP webhooks to external services',
  Zap,
  [
    {
      id: 'url',
      title: 'Webhook URL',
      type: 'short-input',
      layout: 'full',
      placeholder: 'https://example.com/webhook',
      required: true
    },
    {
      id: 'method',
      title: 'HTTP Method',
      type: 'combobox',
      layout: 'half',
      options: () => [
        { id: 'POST', label: 'POST' },
        { id: 'PUT', label: 'PUT' },
        { id: 'PATCH', label: 'PATCH' }
      ]
    },
    {
      id: 'payload',
      title: 'Payload',
      type: 'code',
      layout: 'full',
      language: 'json',
      placeholder: '{"message": "Hello, world!"}'
    }
  ]
);

export const whatsappBlock = createIntegrationBlock(
  'whatsapp',
  'WhatsApp',
  'Send WhatsApp messages',
  MessageSquare,
  [
    {
      id: 'phoneNumber',
      title: 'Phone Number',
      type: 'short-input',
      layout: 'full',
      placeholder: '+1234567890'
    }
  ]
);

export const wikipediaBlock = createIntegrationBlock(
  'wikipedia',
  'Wikipedia',
  'Search and retrieve Wikipedia articles',
  Search,
  [
    {
      id: 'query',
      title: 'Search Query',
      type: 'short-input',
      layout: 'full',
      placeholder: 'artificial intelligence',
      required: true
    }
  ]
);

export const workflowBlock = createIntegrationBlock(
  'workflow',
  'Workflow',
  'Execute sub-workflows and nested processes',
  Zap,
  [
    {
      id: 'workflowId',
      title: 'Workflow ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'workflow-123',
      required: true
    }
  ]
);

export const xBlock = createIntegrationBlock(
  'x',
  'X (Twitter)',
  'Post and manage X (Twitter) content',
  MessageSquare,
  [
    {
      id: 'tweet',
      title: 'Tweet Content',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Your tweet here...',
      rows: 3,
      required: true
    }
  ]
);

export const youTubeBlock = createIntegrationBlock(
  'youtube',
  'YouTube',
  'Search and manage YouTube videos',
  Video,
  [
    {
      id: 'query',
      title: 'Search Query',
      type: 'short-input',
      layout: 'full',
      placeholder: 'machine learning tutorial'
    },
    {
      id: 'maxResults',
      title: 'Max Results',
      type: 'short-input',
      layout: 'half',
      placeholder: '10'
    }
  ]
);

// Export all integration blocks
export const integrationBlocks = {
  airtable: airtableBlock,
  arxiv: arxivBlock,
  browseruse: browserUseBlock,
  clay: clayBlock,
  confluence: confluenceBlock,
  discord: discordBlock,
  elevenlabs: elevenLabsBlock,
  exa: exaBlock,
  file: fileBlock,
  firecrawl: firecrawlBlock,
  github: githubBlock,
  gmail: gmailBlock,
  google: googleBlock,
  googlecalendar: googleCalendarBlock,
  googledocs: googleDocsBlock,
  googledrive: googleDriveBlock,
  googlesheets: googleSheetsBlock,
  huggingface: huggingFaceBlock,
  hunter: hunterBlock,
  imagegenerator: imageGeneratorBlock,
  jina: jinaBlock,
  jira: jiraBlock,
  linear: linearBlock,
  linkup: linkupBlock,
  mem0: mem0Block,
  microsoftexcel: microsoftExcelBlock,
  microsoftplanner: microsoftPlannerBlock,
  microsoftteams: microsoftTeamsBlock,
  mistralparse: mistralParseBlock,
  notion: notionBlock,
  onedrive: oneDriveBlock,
  openai: openAIBlock,
  outlook: outlookBlock,
  perplexity: perplexityBlock,
  pinecone: pineconeBlock,
  qdrant: qdrantBlock,
  reddit: redditBlock,
  s3: s3Block,
  serper: serperBlock,
  sharepoint: sharePointBlock,
  slack: slackBlock,
  stagehand: stagehandBlock,
  stagehandagent: stagehandAgentBlock,
  supabase: supabaseBlock,
  tavily: tavilyBlock,
  telegram: telegramBlock,
  thinking: thinkingBlock,
  translate: translateBlock,
  twilio: twilioBlock,
  typeform: typeformBlock,
  vision: visionBlock,
  wealthbox: wealthboxBlock,
  webhook: webhookBlock,
  whatsapp: whatsappBlock,
  wikipedia: wikipediaBlock,
  workflow: workflowBlock,
  x: xBlock,
  youtube: youTubeBlock,
};
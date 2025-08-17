import { CheckCircle } from 'lucide-react';
import { createElement } from 'react';
import type { FC } from 'react';
import { BlockConfig } from '../types';

const CheckIcon: FC<{ size?: number }> = ({ size }) => createElement(CheckCircle, { size });

export const responseBlock: BlockConfig = {
  type: 'response',
  name: 'Response',
  description: 'Final output of the workflow',
  category: 'io',
  bgColor: '#22c55e',
  icon: CheckIcon,
  subBlocks: [
    {
      id: 'message',
      title: 'Response Message',
      type: 'long-input',
      layout: 'full',
      placeholder: 'Use {{content}} to include AI response, or write custom message',
      rows: 3
    },
    {
      id: 'includeInputs',
      title: 'Include All Inputs',
      type: 'toggle',
      layout: 'half'
    },
    {
      id: 'sourceNodeId',
      title: 'Source Node ID (optional)',
      type: 'short-input',
      layout: 'half',
      placeholder: 'Node ID to get content from'
    }
  ],
  inputs: {
    message: { type: 'string', description: 'Response message' },
    includeInputs: { type: 'any', description: 'Whether to include all workflow data' },
    sourceNodeId: { type: 'string', description: 'Node ID to get content from' },
    data: { type: 'any', description: 'Response data' }
  },
  outputs: {
    response: { type: 'json', description: 'Final workflow response' }
  },
  async run(ctx) {
    const { message, includeInputs, sourceNodeId, data } = ctx.inputs as { 
      message?: unknown; 
      includeInputs?: unknown; 
      sourceNodeId?: unknown;
      data?: unknown; 
    };
    
    let finalMessage = (message as string) || 'Workflow completed';
    
    // Replace placeholders in the message
    if (finalMessage.includes('{{content}}')) {
      let contentToReplace = 'No content available';
      
      // Try to get content from specified source node
      if (sourceNodeId && typeof sourceNodeId === 'string') {
        const nodeContent = ctx.getNodeOutput(sourceNodeId, 'content');
        if (nodeContent && typeof nodeContent === 'string') {
          contentToReplace = nodeContent;
        }
      } else {
        // Auto-detect the previous agent node by looking for any node with 'content' output
        try {
          const allNodeOutputs = ctx.getNodeOutput('*') as Record<string, Record<string, unknown>>;
          ctx.log(`🔍 All available nodes: ${Object.keys(allNodeOutputs).join(', ')}`);
          
          // Look for any node that has 'content' output (likely an agent)
          for (const [nodeId, outputs] of Object.entries(allNodeOutputs)) {
            ctx.log(`🔍 Node ${nodeId} outputs: ${Object.keys(outputs || {}).join(', ')}`);
            if (outputs && typeof outputs === 'object' && 'content' in outputs && typeof outputs.content === 'string') {
              contentToReplace = outputs.content;
              ctx.log(`✅ Found content from ${nodeId}: ${outputs.content.substring(0, 50)}...`);
              break;
            }
          }
          
          // If still no content found, log what we have
          if (contentToReplace === 'No content available') {
            ctx.log(`⚠️ No content found in any node`);
          }
        } catch (e) {
          ctx.log(`⚠️ Error searching for content: ${e}`);
        }
      }
      
      // Clean up the content before replacing
      let cleanedContent = contentToReplace
        // Remove "text " prefix if present
        .replace(/^text\s+/, '')
        // Remove markdown bold formatting
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove markdown italic formatting  
        .replace(/\*(.*?)\*/g, '$1')
        // Clean up quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove bullet points and list formatting
        .replace(/^\s*[*\-+]\s+/gm, '')
        // Clean up excessive punctuation
        .replace(/\*{2,}/g, '')
        .replace(/_{2,}/g, '')
        .trim();
      
      // Add line breaks between dialogue exchanges - more comprehensive approach
      cleanedContent = cleanedContent
        // Match ending punctuation + quote + space + Person/Participant + colon
        .replace(/([.!?]")\s+((?:Person [AB]|Participant \d+):)/g, '$1\n\n$2')
        // Match ending punctuation + space + Person/Participant + colon (no quote)
        .replace(/([.!?])\s+((?:Person [AB]|Participant \d+):)/g, '$1\n\n$2')
        // Fix any remaining spacing issues
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s+/g, '\n');
      
      ctx.log(`🧹 Cleaned content preview: ${cleanedContent.substring(0, 200)}...`);
      
      finalMessage = finalMessage.replace(/\{\{content\}\}/g, cleanedContent);
    }
    
    // Also replace any other placeholders like {{Chatbot AI Agent.content}}
    if (finalMessage.includes('{{') && finalMessage.includes('}}')) {
      try {
        const allNodeOutputs = ctx.getNodeOutput('*') as Record<string, Record<string, unknown>>;
        
        // Look for any node that has 'content' output and use it for any placeholder
        for (const [nodeId, outputs] of Object.entries(allNodeOutputs)) {
          if (outputs && typeof outputs === 'object' && 'content' in outputs && typeof outputs.content === 'string') {
            // Clean up the content before replacing
            let cleanedContent = outputs.content
              // Remove "text " prefix if present
              .replace(/^text\s+/, '')
              // Remove markdown bold formatting
              .replace(/\*\*(.*?)\*\*/g, '$1')
              // Remove markdown italic formatting  
              .replace(/\*(.*?)\*/g, '$1')
              // Clean up quotes
              .replace(/[""]/g, '"')
              .replace(/['']/g, "'")
              // Remove bullet points and list formatting
              .replace(/^\s*[*\-+]\s+/gm, '')
              // Clean up excessive punctuation
              .replace(/\*{2,}/g, '')
              .replace(/_{2,}/g, '')
              .trim();
            
            // Add line breaks between dialogue exchanges - more comprehensive approach
            cleanedContent = cleanedContent
              // Match ending punctuation + quote + space + Person/Participant + colon
              .replace(/([.!?]")\s+((?:Person [AB]|Participant \d+):)/g, '$1\n\n$2')
              // Match ending punctuation + space + Person/Participant + colon (no quote)
              .replace(/([.!?])\s+((?:Person [AB]|Participant \d+):)/g, '$1\n\n$2')
              // Fix any remaining spacing issues
              .replace(/[ \t]+/g, ' ')
              .replace(/\n\s+/g, '\n');
            
            ctx.log(`🧹 Cleaned content preview: ${cleanedContent.substring(0, 200)}...`);
            
            // Replace any remaining placeholders with the cleaned content
            finalMessage = finalMessage.replace(/\{\{[^}]+\}\}/g, cleanedContent);
            ctx.log(`✅ Replaced placeholders with cleaned content from ${nodeId}`);
            break;
          }
        }
      } catch (e) {
        ctx.log(`⚠️ Error replacing placeholders: ${e}`);
      }
    }
    
    const response: Record<string, unknown> = {
      message: finalMessage,
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
    ctx.log(`📋 Final response: ${finalMessage}`);
    
    return response;
  }
};
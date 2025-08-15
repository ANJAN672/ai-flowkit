import { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { getBlockConfig } from '@/lib/blocks/registry';
import type { BlockField } from '@/lib/types';

interface WorkflowNodeData {
  label: string;
  blockConfig?: { subBlocks?: BlockField[]; bgColor?: string; icon?: React.FC<Record<string, unknown>>; description?: string; type?: string };
  status?: 'idle' | 'running' | 'success' | 'error';
  duration?: number;
  [key: string]: unknown;
}

export const WorkflowNode = memo(({ id, data, selected, type }: NodeProps) => {
  const { 
    setSelectedNode, 
    currentExecution,
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    updateWorkflow
  } = useAppStore();
  
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Get block configuration from registry using the node type
  const blockConfig = getBlockConfig(type!);
  const nodeData = data as WorkflowNodeData;
  const { status = 'idle' } = nodeData || {};

  const nodeExecution = currentExecution?.nodeExecutions?.[id as string];
  const currentStatus = nodeExecution?.status || status;

  // Selection is now handled by ReactFlow's onNodeClick

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const IconComponent = blockConfig?.icon;
  const fields: BlockField[] = blockConfig?.subBlocks || [];

  const updateFieldValue = (fieldId: string, value: unknown) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    const wf = ws?.workflows.find(w => w.id === currentWorkflowId);
    if (!ws || !wf) return;

    const updatedNodes = wf.nodes.map(n =>
      n.id === (id as string)
        ? { ...n, data: { ...n.data, [fieldId]: value } }
        : n
    );

  updateWorkflow(ws.id, { ...wf, nodes: updatedNodes, updatedAt: new Date().toISOString() });
  };

  const renderField = (field: BlockField) => {
    const value = nodeData?.[field.id] || '';
    
    switch (field.type) {
      case 'short-input':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-[#cccccc]">{field.title}</Label>
            <Input
              type={field.password ? 'password' : 'text'}
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="h-7 text-xs bg-[#333333] border-[#555555] text-white placeholder:text-[#888888]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
        
      case 'long-input':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-[#cccccc]">{field.title}</Label>
            <Textarea
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="min-h-[50px] text-xs resize-none bg-[#333333] border-[#555555] text-white placeholder:text-[#888888]"
              rows={field.rows || 2}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
        
      case 'combobox': {
        const options = field.options?.() || [];
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-[#cccccc]">{field.title}</Label>
            <Select value={value as string} onValueChange={(val) => updateFieldValue(field.id, val)}>
              <SelectTrigger className="h-7 text-xs bg-[#333333] border-[#555555] text-white" onClick={(e) => e.stopPropagation()}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }
        
      case 'toggle':
        return (
          <div key={field.id} className="flex items-center justify-between py-1">
            <Label className="text-xs font-medium text-[#cccccc]">{field.title}</Label>
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
        
      case 'number':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-foreground">{field.title}</Label>
            <Input
              type="number"
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="h-7 text-xs bg-background border-border"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
        
      case 'datetime':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-foreground">{field.title}</Label>
            <Input
              type="datetime-local"
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="h-7 text-xs bg-background border-border"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
        
      default:
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-foreground">{field.title}</Label>
            <Input
              placeholder={field.placeholder}
              value={value as string}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="h-7 text-xs bg-background border-border"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {/* Rounded background card */}
      <Card
        className={cn(
          'w-[280px] cursor-pointer transition-all duration-200 hover:shadow-lg',
          'bg-[#2a2a2a] border border-[#404040] shadow-sm text-white rounded-lg overflow-hidden',
          selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background border-blue-500',
          currentStatus === 'running' && 'ring-2 ring-blue-500',
          currentStatus === 'error' && 'ring-2 ring-red-500',
          currentStatus === 'success' && 'ring-2 ring-green-500'
        )}
      >
        {/* Sharp rectangular header on top */}
        <div className="p-3 bg-[#2a2a2a] border-b border-[#404040]" style={{ borderRadius: '0' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div 
                className="w-6 h-6 rounded flex items-center justify-center text-white"
                style={{ backgroundColor: blockConfig?.bgColor || '#6b7280' }}
              >
                <IconComponent size={14} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-white">
                {blockConfig?.name || 'Unknown Block'}
              </h3>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {currentStatus !== 'idle' && (
              <Badge className={cn("text-xs px-1.5 py-0.5", getStatusColor(currentStatus as string))}>
                {currentStatus}
              </Badge>
            )}
            
            {fields.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 hover:bg-muted" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsExpanded(!isExpanded); 
                }}
              >
                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </Button>
            )}
          </div>
        </div>
        
        {/* Duration */}
        {nodeExecution?.duration && (
          <div className="text-xs text-[#888888] mt-1">
            {nodeExecution.duration}ms
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {isExpanded && fields.length > 0 && (
        <div className="p-2 space-y-2 bg-[#1f1f1f]">
          <div className="space-y-2">
            {fields.map(renderField)}
          </div>
        </div>
      )}

      </Card>
      
      {/* Handles - Small clean connectors */}
      {blockConfig?.type !== 'starter' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-2 h-4 border border-[#555555] bg-[#666666] hover:bg-blue-500 transition-colors rounded-sm"
          style={{ 
            left: -4, 
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      )}
      
      {blockConfig?.type !== 'response' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-2 h-4 border border-[#555555] bg-[#666666] hover:bg-blue-500 transition-colors rounded-sm"
          style={{ 
            right: -4, 
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        />
      )}
    </div>
  );
});
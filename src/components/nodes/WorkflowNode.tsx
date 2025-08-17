import { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings, Play, Pause, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
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
  const rf = useReactFlow();
  
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
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-3 h-3 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      case 'pending':
        return <Pause className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const IconComponent = blockConfig?.icon;
  const fields: BlockField[] = blockConfig?.subBlocks || [];

  const updateFieldValue = useCallback((fieldId: string, value: unknown) => {
    // Set editing flag to prevent auto-save during typing
    useAppStore.getState().setIsNodeEditing(true);
    
    // Update canvas node data immediately to avoid flicker/reset
    const node = rf.getNode(id as string);
    if (node) {
      rf.setNodes((nds) => nds.map(n => n.id === node.id ? { ...n, data: { ...(n.data || {}), [fieldId]: value } } : n));
    }

    // Debounced persist to store
    const timeoutId = setTimeout(() => {
      const ws = workspaces.find(w => w.id === currentWorkspaceId);
      const wf = ws?.workflows.find(w => w.id === currentWorkflowId);
      if (!ws || !wf) return;

      const updatedNodes = wf.nodes.map(n =>
        n.id === (id as string)
          ? { ...n, data: { ...n.data, [fieldId]: value } }
          : n
      );

      updateWorkflow(ws.id, { ...wf, nodes: updatedNodes, updatedAt: new Date().toISOString() });
      useAppStore.getState().setIsNodeEditing(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [id, rf, workspaces, currentWorkspaceId, currentWorkflowId, updateWorkflow]);

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
              onFocus={() => useAppStore.getState().setIsNodeEditing(true)}
              onBlur={() => useAppStore.getState().setIsNodeEditing(false)}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className="h-7 text-xs bg-[#333333] border-[#555555] text-white placeholder:text-[#888888] nodrag"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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
              onFocus={() => useAppStore.getState().setIsNodeEditing(true)}
              onBlur={() => useAppStore.getState().setIsNodeEditing(false)}
              onChange={(e) => {
                updateFieldValue(field.id, e.target.value);
                const el = e.currentTarget as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 400) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget as HTMLTextAreaElement;
                  const start = el.selectionStart ?? 0;
                  const end = el.selectionEnd ?? 0;
                  const newVal = (value as string).slice(0, start) + '  ' + (value as string).slice(end);
                  updateFieldValue(field.id, newVal);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              className="min-h-[50px] text-xs resize-none bg-[#333333] border-[#555555] text-white placeholder:text-[#888888] font-mono/relaxed nodrag"
              rows={field.rows || 3}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
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
      case 'code':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-[#cccccc]">{field.title}</Label>
            <Textarea
              placeholder={field.placeholder}
              value={value as string}
              onFocus={() => useAppStore.getState().setIsNodeEditing(true)}
              onBlur={() => useAppStore.getState().setIsNodeEditing(false)}
              onChange={(e) => {
                updateFieldValue(field.id, e.target.value);
                const el = e.currentTarget as HTMLTextAreaElement;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 500) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const el = e.currentTarget as HTMLTextAreaElement;
                  const start = el.selectionStart ?? 0;
                  const end = el.selectionEnd ?? 0;
                  const v = String(value || '');
                  const newVal = v.slice(0, start) + '  ' + v.slice(end);
                  updateFieldValue(field.id, newVal);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 2;
                  });
                }
              }}
              className="min-h-[100px] text-xs resize-none bg-[#1f1f1f] border-[#444444] text-white placeholder:text-[#888888] font-mono nodrag"
              rows={field.rows || 8}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      case 'slider':
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium text-[#cccccc] flex items-center justify-between">
              <span>{field.title}</span>
              <span className="text-[10px] text-[#aaaaaa]">{String(value ?? '')}</span>
            </Label>
            <div className="px-1">
              {/* @ts-expect-error - Slider Root uses number[] value */}
              <Slider
                value={[Number(value ?? field.min ?? 0)]}
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                onValueChange={(vals: number[]) => updateFieldValue(field.id, vals[0])}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
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
    <div className="relative group">
      {/* Enhanced Card with vibrant sim.ai-style colors */}
      <Card
        className={cn(
          'w-[300px] cursor-pointer transition-all duration-300 hover:shadow-xl',
          'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-900 dark:text-white rounded-xl overflow-hidden',
          'hover:scale-[1.02] hover:shadow-2xl backdrop-blur-sm',
          selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background border-blue-500 shadow-blue-500/30',
          currentStatus === 'running' && 'ring-2 ring-blue-500 shadow-blue-500/30 bg-blue-50 dark:bg-blue-950/30',
          currentStatus === 'error' && 'ring-2 ring-red-500 shadow-red-500/30 bg-red-50 dark:bg-red-950/30',
          currentStatus === 'success' && 'ring-2 ring-green-500 shadow-green-500/30 bg-green-50 dark:bg-green-950/30'
        )}
        style={{
          background: selected 
            ? `linear-gradient(135deg, ${blockConfig?.bgColor || '#6b7280'}08, ${blockConfig?.bgColor || '#6b7280'}03)`
            : undefined
        }}
      >
        {/* Enhanced Header with vibrant colors */}
        <div 
          className="p-4 border-b border-gray-200 dark:border-gray-700 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${blockConfig?.bgColor || '#6b7280'}20, ${blockConfig?.bgColor || '#6b7280'}10)`,
            borderBottom: `1px solid ${blockConfig?.bgColor || '#6b7280'}20`
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              {IconComponent && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl"
                      style={{ 
                        backgroundColor: blockConfig?.bgColor || '#6b7280',
                        boxShadow: `0 4px 12px ${blockConfig?.bgColor || '#6b7280'}40`
                      }}
                    >
                      <IconComponent size={18} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{blockConfig?.description || 'No description available'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {blockConfig?.name || 'Unknown Block'}
                </h3>
                {blockConfig?.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                    {blockConfig.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status Badge with Icon */}
              {currentStatus !== 'idle' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={cn("text-xs px-2 py-1 flex items-center gap-1", getStatusColor(currentStatus as string))}>
                      {getStatusIcon(currentStatus as string)}
                      {currentStatus}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Node status: {currentStatus}</p>
                    {nodeExecution?.duration && <p>Duration: {nodeExecution.duration}ms</p>}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Expand/Collapse Button */}
              {fields.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 hover:bg-muted/50 transition-colors" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsExpanded(!isExpanded); 
                      }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isExpanded ? 'Collapse' : 'Expand'} configuration</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Quick Action Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      // Quick action - could open AI assist for this specific node
                    }}
                  >
                    <Zap size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quick actions</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          {/* Subtle background pattern */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, ${blockConfig?.bgColor || '#6b7280'} 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${blockConfig?.bgColor || '#6b7280'} 0%, transparent 50%)`
            }}
          />
        </div>

        {/* Enhanced Properties Panel with better colors */}
        {isExpanded && fields.length > 0 && (
          <div 
            className="p-4 space-y-3"
            style={{
              background: `linear-gradient(180deg, ${blockConfig?.bgColor || '#6b7280'}05, ${blockConfig?.bgColor || '#6b7280'}02)`
            }}
          >
            <div className="space-y-3">
              {fields.map(renderField)}
            </div>
            
            {/* Configuration Summary */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{fields.length} configuration{fields.length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">
                  <Settings size={10} />
                  <span className="text-green-600 dark:text-green-400 font-medium">Ready</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      {/* Enhanced Handles with vibrant colors */}
      {blockConfig?.type !== 'starter' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Handle
              type="target"
              position={Position.Left}
              className="w-4 h-4 border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-blue-500 hover:bg-blue-500 transition-all duration-200 rounded-full shadow-lg"
              style={{ 
                left: -8, 
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: `0 2px 8px ${blockConfig?.bgColor || '#6b7280'}30`
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Input connection</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      {blockConfig?.type !== 'response' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Handle
              type="source"
              position={Position.Right}
              className="w-4 h-4 border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-blue-500 hover:bg-blue-500 transition-all duration-200 rounded-full shadow-lg"
              style={{ 
                right: -8, 
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: `0 2px 8px ${blockConfig?.bgColor || '#6b7280'}30`
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Output connection</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
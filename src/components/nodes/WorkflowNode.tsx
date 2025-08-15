import { memo, useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DynamicForm } from '@/components/forms/DynamicForm';
import type { BlockField } from '@/lib/types';

interface WorkflowNodeData {
  label: string;
  blockConfig?: { subBlocks?: BlockField[]; bgColor?: string; icon?: React.FC<Record<string, unknown>>; description?: string; type?: string };
  status?: 'idle' | 'running' | 'success' | 'error';
  duration?: number;
  [key: string]: unknown;
}

export const WorkflowNode = memo(({ id, data, selected }: NodeProps) => {
  const { 
    setSelectedNode, 
    currentExecution,
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    updateWorkflow
  } = useAppStore();
  const nodeData = data as WorkflowNodeData;
  const { label, blockConfig, status = 'idle' } = nodeData || {};
  const [showProps, setShowProps] = useState(false);

  const nodeExecution = currentExecution?.nodeExecutions?.[id as string];
  const currentStatus = nodeExecution?.status || status;

  const handleClick = () => {
    setSelectedNode(id as string);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-exec-running text-white';
      case 'success':
        return 'bg-exec-success text-white';
      case 'error':
        return 'bg-exec-error text-white';
      case 'pending':
        return 'bg-exec-pending text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const IconComponent = blockConfig?.icon;
  const fields: BlockField[] = useMemo(() => (blockConfig?.subBlocks || []) as BlockField[], [blockConfig?.subBlocks]);

  const initialValues = useMemo<Record<string, unknown>>(() => {
    // Values are stored in nodeData; pass through for the DynamicForm
    const vals: Record<string, unknown> = {};
    fields.forEach((f: BlockField) => {
      vals[f.id] = (nodeData && nodeData[f.id] !== undefined) ? nodeData[f.id] : '';
    });
    return vals;
  }, [fields, nodeData]);

  const persistNodeData = (values: Record<string, unknown>) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    const wf = ws?.workflows.find(w => w.id === currentWorkflowId);
    if (!ws || !wf) return;

    // Sanitize: only persist fields defined in subBlocks
    const sanitized: Record<string, unknown> = {};
    fields.forEach((f: BlockField) => {
      sanitized[f.id] = values[f.id];
    });

    const updatedNodes = wf.nodes.map(n =>
      n.id === (id as string)
        ? { ...n, data: { ...sanitized } }
        : n
    );

    updateWorkflow(ws.id, { ...wf, nodes: updatedNodes });
  };

  return (
    <Card
      className={cn(
        'min-w-[180px] cursor-pointer transition-all duration-200 hover:shadow-md',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        currentStatus === 'running' && 'ring-2 ring-exec-running ring-offset-2',
        currentStatus === 'error' && 'ring-2 ring-exec-error ring-offset-2'
      )}
      onClick={handleClick}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div 
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: blockConfig?.bgColor || '#6b7280' }}
              >
                <IconComponent size={14} />
              </div>
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {label}
            </span>
          </div>
          
          {currentStatus !== 'idle' && (
            <Badge variant="secondary" className={getStatusColor(currentStatus as string)}>
              {currentStatus}
            </Badge>
          )}
          {/* Inline props toggle (only if the block has fields) */}
          {fields.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7" onClick={(e) => { e.stopPropagation(); setShowProps(v => !v); }}>
              {showProps ? 'Hide' : 'Edit'}
            </Button>
          )}
        </div>

        {/* Duration badge */}
        {nodeExecution?.duration && (
          <div className="text-xs text-muted-foreground">
            {nodeExecution.duration}ms
          </div>
        )}

        {/* Description */}
        {blockConfig?.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {blockConfig.description}
          </p>
        )}

        {/* Inline Properties */}
        {showProps && fields.length > 0 && (
          <div className="mt-3">
            <DynamicForm
              fields={fields}
              values={initialValues}
              onChange={persistNodeData}
            />
          </div>
        )}
      </div>

      {/* Handles */}
      {blockConfig?.type !== 'starter' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-background bg-muted"
        />
      )}
      
      {blockConfig?.type !== 'response' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-background bg-muted"
        />
      )}
    </Card>
  );
});
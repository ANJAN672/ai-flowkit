import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface WorkflowNodeData {
  label: string;
  blockConfig?: any;
  status?: 'idle' | 'running' | 'success' | 'error';
  duration?: number;
  [key: string]: any;
}

export const WorkflowNode = memo(({ id, data, selected }: NodeProps) => {
  const { setSelectedNode, currentExecution } = useAppStore();
  const nodeData = data as WorkflowNodeData;
  const { label, blockConfig, status = 'idle' } = nodeData || {};

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
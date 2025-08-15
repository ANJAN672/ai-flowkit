import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trash2, Copy, Download } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';

export function ExecutionLog() {
  const { currentExecution, clearExecution } = useAppStore();

  const handleClear = () => {
    clearExecution();
  };

  const handleCopy = () => {
    if (currentExecution) {
      const logText = currentExecution.logs
        .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
        .join('\n');
      navigator.clipboard.writeText(logText);
    }
  };

  const handleDownload = () => {
    if (currentExecution) {
      const logText = currentExecution.logs
        .map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`)
        .join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-log-${currentExecution.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-destructive';
      case 'warn':
        return 'text-warning';
      case 'info':
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'success':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-t border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Execution Log</h3>
            {currentExecution && (
              <Badge variant={getStatusBadgeVariant(currentExecution.status)}>
                {currentExecution.status}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Execution Summary */}
        {currentExecution && (
          <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Started:</span>
              <div className="font-mono">
                {formatDistanceToNow(new Date(currentExecution.startTime), { addSuffix: true })}
              </div>
            </div>
            
            {currentExecution.endTime && (
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <div className="font-mono">
                  {currentExecution.duration || 0}ms
                </div>
              </div>
            )}
            
            <div>
              <span className="text-muted-foreground">Logs:</span>
              <div className="font-mono">
                {currentExecution.logs.length}
              </div>
            </div>
            
            <div>
              <span className="text-muted-foreground">Nodes:</span>
              <div className="font-mono">
                {Object.keys(currentExecution.nodeExecutions).length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {currentExecution && currentExecution.logs.length > 0 ? (
            <div className="space-y-2">
              {currentExecution.logs.map((log) => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                        {log.nodeId && (
                          <Badge variant="secondary" className="text-xs">
                            {log.nodeId}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${getLogLevelColor(log.level)}`}>
                        {log.message}
                      </p>
                    </div>
                    
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {currentExecution ? 'No logs yet' : 'Run a workflow to see execution logs'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
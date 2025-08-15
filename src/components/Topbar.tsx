import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Save, 
  Play, 
  Square, 
  Undo, 
  Redo, 
  FileText, 
  MessageSquare,
  Moon,
  Sun
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Topbar() {
  const {
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    setCurrentWorkspace,
    isExecuting,
    startExecution,
    stopExecution,
    toggleExecutionLog,
    toggleCopilot,
    showExecutionLog,
    showCopilot,
    isDarkMode,
  toggleDarkMode,
  saveToStorage
  } = useAppStore();

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);

  const handleRun = () => {
    if (currentWorkflowId) {
      startExecution(currentWorkflowId);
    }
  };

  const handleStop = () => {
    stopExecution();
  };

  return (
    <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* Home */}
        <Button variant="ghost" size="sm">
          <Home className="w-4 h-4" />
        </Button>

        {/* Workspace Selector */}
        <div className="flex items-center gap-2">
          <Select value={currentWorkspaceId || ''} onValueChange={setCurrentWorkspace}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {currentWorkflow && (
            <Badge variant="outline">
              {currentWorkflow.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Action Buttons */}
  <Button variant="ghost" size="sm" onClick={saveToStorage}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button variant="ghost" size="sm">
          <Undo className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="sm">
          <Redo className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Execution Controls */}
        {isExecuting ? (
          <Button variant="destructive" size="sm" onClick={handleStop}>
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={handleRun}>
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        )}

        <div className="w-px h-6 bg-border mx-2" />

        {/* View Toggles */}
        <Button 
          variant={showExecutionLog ? "default" : "ghost"} 
          size="sm"
          onClick={toggleExecutionLog}
        >
          <FileText className="w-4 h-4 mr-2" />
          Logs
        </Button>

        <Button 
          variant={showCopilot ? "default" : "ghost"} 
          size="sm"
          onClick={toggleCopilot}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Copilot
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Theme Toggle */}
        <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
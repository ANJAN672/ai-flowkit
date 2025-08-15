import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  Sun,
  ChevronLeft,
  ChevronDown,
  Trash2,
  Sparkles,
  Printer,
  Wand2,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from '@/components/ui/menubar';

interface TopbarProps {
  onExecute: () => void;
  isExecuting: boolean;
}

export function Topbar({ onExecute, isExecuting }: TopbarProps) {
  const {
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    setCurrentWorkspace,
    isDarkMode,
    toggleDarkMode,
    saveToStorage
  } = useAppStore();

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);
  const { openRightPanel } = useAppStore();

  return (
    <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      {/* Left Side - Just Workspace */}
      <div className="flex items-center gap-3">
        {/* Workspace Selector - EXACTLY like sim.ai */}
        <div className="flex items-center gap-2">
          <Select value={currentWorkspaceId || ''} onValueChange={setCurrentWorkspace}>
            <SelectTrigger className="w-48 h-8 bg-transparent border-none">
              <SelectValue placeholder="ANJAN's Workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ChevronDown className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <FileText className="w-4 h-4" />
          </Button>
        </div>

  {/* Removed Topbar search */}
      </div>

      {/* Right Side - Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Horizontal dropdown to open right panel sections */}
        <div className="mr-2">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger className="h-8">Panels</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => openRightPanel('chat')}>Chat</MenubarItem>
                <MenubarItem onClick={() => openRightPanel('console')}>Console</MenubarItem>
                <MenubarItem onClick={() => openRightPanel('copilot')}>Copilot</MenubarItem>
                <MenubarItem onClick={() => openRightPanel('variables')}>Variables</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
        {/* Navigation */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Action Icons - EXACTLY like sim.ai */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Trash2 className="w-4 h-4" />
        </Button>
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Sparkles className="w-4 h-4" />
        </Button>
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Printer className="w-4 h-4" />
        </Button>
        
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Wand2 className="w-4 h-4" />
        </Button>

  {/* Removed duplicate right panel tabs from Topbar */}

        {/* Big Purple Run Button - EXACTLY like sim.ai */}
        {isExecuting ? (
          <Button variant="destructive" size="sm" className="h-8 px-6 ml-4">
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button 
            className="h-8 px-6 ml-4 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={onExecute}
          >
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        )}
      </div>
    </div>
  );
}
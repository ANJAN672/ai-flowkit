import { Button } from '@/components/ui/button';
import { MessageSquare, Terminal, Bot, Settings, X } from 'lucide-react';
import { ExecutionLog } from './ExecutionLog';
import { Copilot } from './Copilot';
import { useAppStore } from '@/lib/store';

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, closeRightPanel } = useAppStore();

  if (!rightPanelOpen || !rightPanelTab) return null;

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Tab Headers */}
      <div className="border-b border-border bg-card p-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {rightPanelTab === 'chat' && (<><MessageSquare size={16} /><span>Chat</span></>)}
          {rightPanelTab === 'console' && (<><Terminal size={16} /><span>Console</span></>)}
          {rightPanelTab === 'copilot' && (<><Bot size={16} /><span>Copilot</span></>)}
          {rightPanelTab === 'variables' && (<><Settings size={16} /><span>Variables</span></>)}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close panel" onClick={closeRightPanel}>
          <X size={14} />
        </Button>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 min-h-0">
  {rightPanelTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare size={16} />
                <span>Chat</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close Chat" onClick={closeRightPanel}>
                <X size={14} />
              </Button>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p>Chat with AI</p>
                <p className="text-xs mt-1">Coming soon...</p>
              </div>
            </div>
          </div>
        )}

  {rightPanelTab === 'console' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <Terminal size={16} />
                <span>Console</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close Console" onClick={closeRightPanel}>
                <X size={14} />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <ExecutionLog />
            </div>
          </div>
        )}

  {rightPanelTab === 'copilot' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <Bot size={16} />
                <span>Copilot</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close Copilot" onClick={closeRightPanel}>
                <X size={14} />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <Copilot />
            </div>
          </div>
        )}

  {rightPanelTab === 'variables' && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2 text-sm">
                <Settings size={16} />
                <span>Variables</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close Variables" onClick={closeRightPanel}>
                <X size={14} />
              </Button>
            </div>
            <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Settings size={32} className="mx-auto mb-2 opacity-50" />
                <p>Workflow Variables</p>
                <p className="text-xs mt-1">Coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Terminal, Bot, Settings, X } from 'lucide-react';
import { ExecutionLog } from './ExecutionLog';
import { Copilot } from './Copilot';

type PanelType = 'chat' | 'console' | 'copilot' | 'variables' | null;

export function FloatingPanels() {
  const [openPanel, setOpenPanel] = useState<PanelType>(null);

  const togglePanel = (panel: PanelType) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  const closePanel = () => {
    setOpenPanel(null);
  };

  return (
    <>
      {/* Floating Action Buttons */}
      <div className="fixed right-4 bottom-4 flex flex-col gap-2 z-50">
        <Button
          variant={openPanel === 'chat' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => togglePanel('chat')}
          className="flex items-center gap-2 shadow-lg"
        >
          <MessageSquare size={16} />
          Chat
        </Button>
        
        <Button
          variant={openPanel === 'console' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => togglePanel('console')}
          className="flex items-center gap-2 shadow-lg"
        >
          <Terminal size={16} />
          Console
        </Button>
        
        <Button
          variant={openPanel === 'copilot' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => togglePanel('copilot')}
          className="flex items-center gap-2 shadow-lg"
        >
          <Bot size={16} />
          Copilot
        </Button>
        
        <Button
          variant={openPanel === 'variables' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => togglePanel('variables')}
          className="flex items-center gap-2 shadow-lg"
        >
          <Settings size={16} />
          Variables
        </Button>
      </div>

      {/* Floating Panel */}
      {openPanel && (
        <Card className="fixed right-4 bottom-48 w-96 h-96 z-40 shadow-2xl border bg-card">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              {openPanel === 'chat' && <><MessageSquare size={16} /> Chat</>}
              {openPanel === 'console' && <><Terminal size={16} /> Console</>}
              {openPanel === 'copilot' && <><Bot size={16} /> Copilot</>}
              {openPanel === 'variables' && <><Settings size={16} /> Variables</>}
            </div>
            <Button variant="ghost" size="sm" onClick={closePanel} className="h-6 w-6 p-0">
              <X size={14} />
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 h-full overflow-hidden">
            {openPanel === 'chat' && (
              <div className="h-full p-4 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Chat with AI</p>
                  <p className="text-xs mt-1">Coming soon...</p>
                </div>
              </div>
            )}
            
            {openPanel === 'console' && (
              <div className="h-full">
                <ExecutionLog />
              </div>
            )}
            
            {openPanel === 'copilot' && (
              <div className="h-full">
                <Copilot />
              </div>
            )}
            
            {openPanel === 'variables' && (
              <div className="h-full p-4 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Settings size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Workflow Variables</p>
                  <p className="text-xs mt-1">Coming soon...</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
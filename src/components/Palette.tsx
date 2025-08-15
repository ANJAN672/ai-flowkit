import { useState } from 'react';
import { Search, Plus, Settings, HelpCircle, BookOpen, Folder, ChevronDown, Copy as CopyIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllBlocks } from '@/lib/blocks/registry';
import { useAppStore } from '@/lib/store';

export function Palette() {
  const [searchTerm, setSearchTerm] = useState('');

  const allBlocks = getAllBlocks();
  const { workspaces, currentWorkspaceId } = useAppStore();
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  
  const filteredBlocks = allBlocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const onDragStart = (event: React.DragEvent, blockType: string) => {
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full relative overflow-hidden">
      <div className="h-full overflow-y-auto overscroll-contain scrollbar-none">
        <div className="p-3 space-y-3">
          {/* Workspace selector */}
          <Card className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium truncate">{currentWorkspace?.name || "My Workspace"}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronDown className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><CopyIcon className="w-4 h-4" /></Button>
            </div>
          </Card>

          {/* Global search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Search anything" className="pl-10 pr-14" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">ctrl k</span>
          </div>
          {/* Quick agent list */}
          <Card className="p-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm truncate">default-agent</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="w-4 h-4" />
            </Button>
          </Card>

          {/* Blocks search + list as a single card */}
          <Card className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search blocks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="pb-1 space-y-1">
              {filteredBlocks.map((block) => {
            const IconComponent = block.icon;

                return (
                  <button
                    key={block.type}
                    className="w-full text-left px-2 py-2 rounded-md hover:bg-muted cursor-grab active:cursor-grabbing flex items-center gap-3"
                    draggable
                    onDragStart={(e) => onDragStart(e, block.type)}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: block.bgColor || '#6b7280' }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <span className="text-sm truncate">{block.name}</span>
                  </button>
                );
              })}

              {filteredBlocks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No blocks found</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Spacer for bottom dock */}
        <div className="h-20" />
      </div>

      {/* Bottom dock */}
  <div className="absolute left-0 right-0 bottom-0 px-3 py-2 bg-card/80 backdrop-blur border-t border-border pointer-events-auto">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Settings className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><HelpCircle className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><BookOpen className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><Folder className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
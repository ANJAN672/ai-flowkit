import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllBlocks, getBlocksByCategory } from '@/lib/blocks/registry';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'blocks', name: 'Blocks', icon: '🧩' },
  { id: 'control', name: 'Control', icon: '🔀' },
  { id: 'io', name: 'I/O', icon: '📡' },
  { id: 'tools', name: 'Tools', icon: '🛠️' },
  { id: 'integrations', name: 'Integrations', icon: '🔗' }
];

export function Palette() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allBlocks = getAllBlocks();
  
  const filteredBlocks = allBlocks.filter(block => {
    const matchesSearch = block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         block.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || block.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const onDragStart = (event: React.DragEvent, blockType: string) => {
    event.dataTransfer.setData('application/reactflow', blockType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="h-full">
      <ScrollArea className="h-full overscroll-contain">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Blocks</h2>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search blocks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks List */}
        <div className="p-4 space-y-2">
          {filteredBlocks.map((block) => {
            const IconComponent = block.icon;

            return (
              <Card
                key={block.type}
                className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => onDragStart(e, block.type)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: block.bgColor || '#6b7280' }}
                  >
                    <IconComponent size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{block.name}</h4>
                    {block.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{block.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredBlocks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No blocks found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
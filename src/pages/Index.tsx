import { useEffect } from 'react';
import { WorkflowBuilder } from '@/components/WorkflowBuilder';
import { useAppStore } from '@/lib/store';

const Index = () => {
  const { loadFromStorage, createWorkspace, workspaces, currentWorkspaceId } = useAppStore();

  useEffect(() => {
    loadFromStorage();
    
    // Create default workspace if none exist
    if (workspaces.length === 0) {
      createWorkspace('My Workspace');
    }
  }, [loadFromStorage, createWorkspace, workspaces.length]);

  if (!currentWorkspaceId && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Workflow Builder...</h1>
        </div>
      </div>
    );
  }

  return <WorkflowBuilder />;
};

export default Index;

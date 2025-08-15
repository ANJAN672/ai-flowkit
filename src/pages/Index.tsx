import { useEffect } from 'react';
import { WorkflowBuilder } from '@/components/WorkflowBuilder';
import { useAppStore } from '@/lib/store';

const Index = () => {
  const { loadFromStorage, createWorkspace, workspaces, currentWorkspaceId } = useAppStore();

  useEffect(() => {
    // Load data from localStorage first
    loadFromStorage();
    
    // Create default workspace if none exist
    if (workspaces.length === 0) {
      createWorkspace('My Workspace');
    }
  }, [loadFromStorage, createWorkspace, workspaces.length]);

  // Show loading state while initializing
  if (!currentWorkspaceId && workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold mb-2">Loading AI FlowKit</h1>
          <p className="text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return <WorkflowBuilder />;
};

export default Index;

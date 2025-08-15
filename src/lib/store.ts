import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { Workspace, Workflow, WorkflowExecution, ExecutionLog } from './types';
import { loadFromStorage, saveToStorage } from './storage';

interface AppState {
  // Workspaces
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkflowId: string | null;
  
  // UI state
  selectedNodeId: string | null;
  showExecutionLog: boolean;
  showCopilot: boolean;
  isDarkMode: boolean;
  
  // Execution
  currentExecution: WorkflowExecution | null;
  isExecuting: boolean;
  
  // History
  history: any[];
  historyIndex: number;
  
  // Settings
  apiKeys: Record<string, string>;
}

interface AppActions {
  // Workspace actions
  createWorkspace: (name: string) => void;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setCurrentWorkspace: (id: string) => void;
  
  // Workflow actions
  createWorkflow: (workspaceId: string, name: string) => void;
  deleteWorkflow: (workspaceId: string, workflowId: string) => void;
  renameWorkflow: (workspaceId: string, workflowId: string, name: string) => void;
  setCurrentWorkflow: (id: string) => void;
  updateWorkflow: (workspaceId: string, workflow: Workflow) => void;
  
  // UI actions
  setSelectedNode: (id: string | null) => void;
  toggleExecutionLog: () => void;
  toggleCopilot: () => void;
  toggleDarkMode: () => void;
  
  // Execution actions
  startExecution: (workflowId: string) => void;
  stopExecution: () => void;
  addExecutionLog: (log: ExecutionLog) => void;
  clearExecution: () => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: (state: any) => void;
  
  // Settings actions
  setApiKey: (provider: string, key: string) => void;
  removeApiKey: (provider: string) => void;
  
  // Storage actions
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
        // Initial state
        workspaces: [],
        currentWorkspaceId: null,
        currentWorkflowId: null,
        selectedNodeId: null,
        showExecutionLog: false,
        showCopilot: false,
        isDarkMode: false,
        currentExecution: null,
        isExecuting: false,
        history: [],
        historyIndex: -1,
        apiKeys: {},

        // Workspace actions
        createWorkspace: (name: string) => {
          set((state) => {
            const workspace: Workspace = {
              id: `ws-${Date.now()}`,
              name,
              workflows: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            return {
              ...state,
              workspaces: [...state.workspaces, workspace],
              currentWorkspaceId: workspace.id
            };
          });
        },

        deleteWorkspace: (id: string) => {
          set((state) => {
            const newWorkspaces = state.workspaces.filter(ws => ws.id !== id);
            return {
              ...state,
              workspaces: newWorkspaces,
              currentWorkspaceId: state.currentWorkspaceId === id ? newWorkspaces[0]?.id || null : state.currentWorkspaceId,
              currentWorkflowId: state.currentWorkspaceId === id ? null : state.currentWorkflowId
            };
          });
        },

        renameWorkspace: (id: string, name: string) => {
          set((state) => ({
            ...state,
            workspaces: state.workspaces.map(ws =>
              ws.id === id 
                ? { ...ws, name, updatedAt: new Date().toISOString() }
                : ws
            )
          }));
        },

        setCurrentWorkspace: (id: string) => {
          set((state) => ({
            ...state,
            currentWorkspaceId: id,
            currentWorkflowId: null
          }));
        },

        // Workflow actions
        createWorkflow: (workspaceId: string, name: string) => {
          set((state) => {
            const workflow: Workflow = {
              id: `wf-${Date.now()}`,
              name,
              nodes: [{
                id: 'starter',
                type: 'starter',
                position: { x: 100, y: 100 },
                data: {}
              }],
              edges: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              starterId: 'starter'
            };

            return {
              ...state,
              workspaces: state.workspaces.map(ws =>
                ws.id === workspaceId
                  ? {
                      ...ws,
                      workflows: [...ws.workflows, workflow],
                      updatedAt: new Date().toISOString()
                    }
                  : ws
              ),
              currentWorkflowId: workflow.id
            };
          });
        },

        deleteWorkflow: (workspaceId: string, workflowId: string) => {
          set((state) => ({
            ...state,
            workspaces: state.workspaces.map(ws =>
              ws.id === workspaceId
                ? {
                    ...ws,
                    workflows: ws.workflows.filter(wf => wf.id !== workflowId),
                    updatedAt: new Date().toISOString()
                  }
                : ws
            ),
            currentWorkflowId: state.currentWorkflowId === workflowId 
              ? state.workspaces.find(ws => ws.id === workspaceId)?.workflows.filter(wf => wf.id !== workflowId)[0]?.id || null
              : state.currentWorkflowId
          }));
        },

        renameWorkflow: (workspaceId: string, workflowId: string, name: string) => {
          set((state) => ({
            ...state,
            workspaces: state.workspaces.map(ws =>
              ws.id === workspaceId
                ? {
                    ...ws,
                    workflows: ws.workflows.map(wf =>
                      wf.id === workflowId
                        ? { ...wf, name, updatedAt: new Date().toISOString() }
                        : wf
                    ),
                    updatedAt: new Date().toISOString()
                  }
                : ws
            )
          }));
        },

        setCurrentWorkflow: (id: string) => {
          set((state) => ({ ...state, currentWorkflowId: id }));
        },

        updateWorkflow: (workspaceId: string, workflow: Workflow) => {
          set((state) => ({
            ...state,
            workspaces: state.workspaces.map(ws =>
              ws.id === workspaceId
                ? {
                    ...ws,
                    workflows: ws.workflows.map(wf =>
                      wf.id === workflow.id
                        ? { ...workflow, updatedAt: new Date().toISOString() }
                        : wf
                    ),
                    updatedAt: new Date().toISOString()
                  }
                : ws
            )
          }));
        },

        // UI actions
        setSelectedNode: (id: string | null) => {
          set((state) => ({ ...state, selectedNodeId: id }));
        },

        toggleExecutionLog: () => {
          set((state) => ({ ...state, showExecutionLog: !state.showExecutionLog }));
        },

        toggleCopilot: () => {
          set((state) => ({ ...state, showCopilot: !state.showCopilot }));
        },

        toggleDarkMode: () => {
          set((state) => {
            const newDarkMode = !state.isDarkMode;
            document.documentElement.classList.toggle('dark', newDarkMode);
            return { ...state, isDarkMode: newDarkMode };
          });
        },

        // Execution actions
        startExecution: async (workflowId: string) => {
          const state = get();
          const workspace = state.workspaces.find(ws => ws.id === state.currentWorkspaceId);
          const workflow = workspace?.workflows.find(wf => wf.id === workflowId);
          
          if (!workflow) return;

          const execution: WorkflowExecution = {
            id: `exec-${Date.now()}`,
            workflowId,
            status: 'running',
            startTime: new Date().toISOString(),
            logs: [],
            nodeExecutions: {}
          };

          set((state) => ({
            ...state,
            isExecuting: true,
            currentExecution: execution
          }));

          // Import and run execution engine
          try {
            const { executeWorkflow } = await import('./execution/engine');
            const result = await executeWorkflow(
              workflow,
              state.apiKeys,
              (log) => {
                set((currentState) => ({
                  ...currentState,
                  currentExecution: currentState.currentExecution
                    ? { ...currentState.currentExecution, logs: [...currentState.currentExecution.logs, log] }
                    : null
                }));
              },
              (nodeId, nodeExecution) => {
                set((currentState) => ({
                  ...currentState,
                  currentExecution: currentState.currentExecution
                    ? {
                        ...currentState.currentExecution,
                        nodeExecutions: { ...currentState.currentExecution.nodeExecutions, [nodeId]: nodeExecution }
                      }
                    : null
                }));
              }
            );
            
            set((state) => ({
              ...state,
              currentExecution: result,
              isExecuting: false
            }));
          } catch (error) {
            set((state) => ({
              ...state,
              currentExecution: state.currentExecution
                ? {
                    ...state.currentExecution,
                    status: 'error' as const,
                    endTime: new Date().toISOString()
                  }
                : null,
              isExecuting: false
            }));
          }
        },

        stopExecution: () => {
          set((state) => ({
            ...state,
            isExecuting: false,
            currentExecution: state.currentExecution
              ? {
                  ...state.currentExecution,
                  status: 'cancelled' as const,
                  endTime: new Date().toISOString()
                }
              : null
          }));
        },

        addExecutionLog: (log: ExecutionLog) => {
          set((state) => ({
            ...state,
            currentExecution: state.currentExecution
              ? { ...state.currentExecution, logs: [...state.currentExecution.logs, log] }
              : null
          }));
        },

        clearExecution: () => {
          set((state) => ({
            ...state,
            currentExecution: null,
            isExecuting: false
          }));
        },

        // History actions (simplified for MVP)
        undo: () => {
          // TODO: Implement undo functionality
        },

        redo: () => {
          // TODO: Implement redo functionality
        },

        pushHistory: (state: any) => {
          // TODO: Implement history push
        },

        // Settings actions
        setApiKey: (provider: string, key: string) => {
          set((state) => ({
            ...state,
            apiKeys: { ...state.apiKeys, [provider]: key }
          }));
        },

        removeApiKey: (provider: string) => {
          set((state) => {
            const newApiKeys = { ...state.apiKeys };
            delete newApiKeys[provider];
            return { ...state, apiKeys: newApiKeys };
          });
        },

        // Storage actions
        loadFromStorage: () => {
          const data = loadFromStorage();
          set((state) => ({ ...state, ...data }));
        },

        saveToStorage: () => {
          const state = get();
          saveToStorage({
            workspaces: state.workspaces,
            currentWorkspaceId: state.currentWorkspaceId,
            currentWorkflowId: state.currentWorkflowId,
            isDarkMode: state.isDarkMode,
            apiKeys: state.apiKeys
          });
        }
      }))
    )
  )
);

// Auto-save to localStorage
useAppStore.subscribe(
  (state) => state,
  (state) => state.saveToStorage(),
  { fireImmediately: false }
);
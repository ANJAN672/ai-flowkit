import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
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
    subscribeWithSelector(
      immer((set, get) => ({
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
            state.workspaces.push(workspace);
            state.currentWorkspaceId = workspace.id;
          });
        },

        deleteWorkspace: (id: string) => {
          set((state) => {
            state.workspaces = state.workspaces.filter(ws => ws.id !== id);
            if (state.currentWorkspaceId === id) {
              state.currentWorkspaceId = state.workspaces[0]?.id || null;
              state.currentWorkflowId = null;
            }
          });
        },

        renameWorkspace: (id: string, name: string) => {
          set((state) => {
            const workspace = state.workspaces.find(ws => ws.id === id);
            if (workspace) {
              workspace.name = name;
              workspace.updatedAt = new Date().toISOString();
            }
          });
        },

        setCurrentWorkspace: (id: string) => {
          set((state) => {
            state.currentWorkspaceId = id;
            state.currentWorkflowId = null;
          });
        },

        // Workflow actions
        createWorkflow: (workspaceId: string, name: string) => {
          set((state) => {
            const workspace = state.workspaces.find(ws => ws.id === workspaceId);
            if (workspace) {
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
              workspace.workflows.push(workflow);
              workspace.updatedAt = new Date().toISOString();
              state.currentWorkflowId = workflow.id;
            }
          });
        },

        deleteWorkflow: (workspaceId: string, workflowId: string) => {
          set((state) => {
            const workspace = state.workspaces.find(ws => ws.id === workspaceId);
            if (workspace) {
              workspace.workflows = workspace.workflows.filter(wf => wf.id !== workflowId);
              workspace.updatedAt = new Date().toISOString();
              if (state.currentWorkflowId === workflowId) {
                state.currentWorkflowId = workspace.workflows[0]?.id || null;
              }
            }
          });
        },

        renameWorkflow: (workspaceId: string, workflowId: string, name: string) => {
          set((state) => {
            const workspace = state.workspaces.find(ws => ws.id === workspaceId);
            const workflow = workspace?.workflows.find(wf => wf.id === workflowId);
            if (workflow) {
              workflow.name = name;
              workflow.updatedAt = new Date().toISOString();
              if (workspace) {
                workspace.updatedAt = new Date().toISOString();
              }
            }
          });
        },

        setCurrentWorkflow: (id: string) => {
          set((state) => {
            state.currentWorkflowId = id;
          });
        },

        updateWorkflow: (workspaceId: string, workflow: Workflow) => {
          set((state) => {
            const workspace = state.workspaces.find(ws => ws.id === workspaceId);
            if (workspace) {
              const index = workspace.workflows.findIndex(wf => wf.id === workflow.id);
              if (index !== -1) {
                workspace.workflows[index] = { ...workflow, updatedAt: new Date().toISOString() };
                workspace.updatedAt = new Date().toISOString();
              }
            }
          });
        },

        // UI actions
        setSelectedNode: (id: string | null) => {
          set((state) => {
            state.selectedNodeId = id;
          });
        },

        toggleExecutionLog: () => {
          set((state) => {
            state.showExecutionLog = !state.showExecutionLog;
          });
        },

        toggleCopilot: () => {
          set((state) => {
            state.showCopilot = !state.showCopilot;
          });
        },

        toggleDarkMode: () => {
          set((state) => {
            state.isDarkMode = !state.isDarkMode;
            document.documentElement.classList.toggle('dark', state.isDarkMode);
          });
        },

        // Execution actions
        startExecution: async (workflowId: string) => {
          const state = get();
          const workspace = state.workspaces.find(ws => ws.id === state.currentWorkspaceId);
          const workflow = workspace?.workflows.find(wf => wf.id === workflowId);
          
          if (!workflow) return;

          set((state) => {
            state.isExecuting = true;
            state.currentExecution = {
              id: `exec-${Date.now()}`,
              workflowId,
              status: 'running',
              startTime: new Date().toISOString(),
              logs: [],
              nodeExecutions: {}
            };
          });

          // Import and run execution engine
          try {
            const { executeWorkflow } = await import('./execution/engine');
            const result = await executeWorkflow(
              workflow,
              state.apiKeys,
              (log) => state.addExecutionLog(log),
              (nodeId, execution) => {
                set((state) => {
                  if (state.currentExecution) {
                    state.currentExecution.nodeExecutions[nodeId] = execution;
                  }
                });
              }
            );
            
            set((state) => {
              state.currentExecution = result;
              state.isExecuting = false;
            });
          } catch (error) {
            set((state) => {
              if (state.currentExecution) {
                state.currentExecution.status = 'error';
                state.currentExecution.endTime = new Date().toISOString();
              }
              state.isExecuting = false;
            });
          }
        },

        stopExecution: () => {
          set((state) => {
            state.isExecuting = false;
            if (state.currentExecution) {
              state.currentExecution.status = 'cancelled';
              state.currentExecution.endTime = new Date().toISOString();
            }
          });
        },

        addExecutionLog: (log: ExecutionLog) => {
          set((state) => {
            if (state.currentExecution) {
              state.currentExecution.logs.push(log);
            }
          });
        },

        clearExecution: () => {
          set((state) => {
            state.currentExecution = null;
            state.isExecuting = false;
          });
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
          set((state) => {
            state.apiKeys[provider] = key;
          });
        },

        removeApiKey: (provider: string) => {
          set((state) => {
            delete state.apiKeys[provider];
          });
        },

        // Storage actions
        loadFromStorage: () => {
          const data = loadFromStorage();
          set((state) => {
            Object.assign(state, data);
          });
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
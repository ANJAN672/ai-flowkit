import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange, ReactFlowInstance as RFCoreInstance } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { NodeTypes as RFNodeTypes, NodeProps as RFNodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/lib/store';
import { useHotkeys } from 'react-hotkeys-hook';
import { Palette } from './Palette';
import { Topbar } from './Topbar';
import { ExecutionLog } from './ExecutionLog';
import { Copilot } from './Copilot';
import { RightPanel } from './RightPanel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { getAllBlocks, getBlockConfig } from '@/lib/blocks/registry';
import { WorkflowNode } from './nodes/WorkflowNode';
import { FlowEdge } from './nodes/FlowEdge';
import { executeWorkflow } from '@/lib/execution/engine';
import type { Workflow as WorkflowType, WorkflowNode as WfNode, WorkflowEdge as WfEdge } from '@/lib/types';

// Support all registered blocks without changing visual node design
// by mapping every block type to the same WorkflowNode component.
// This fixes drag-and-drop for integration blocks too.
const useDynamicNodeTypes = () =>
  useMemo(() => {
    const allBlocks = getAllBlocks();
    const nodeTypes: RFNodeTypes = {};
    
    allBlocks.forEach(block => {
      nodeTypes[block.type] = WorkflowNode as ComponentType<RFNodeProps>;
    });
    
    return nodeTypes;
  }, []);

const edgeTypes = {
  default: FlowEdge,
};

// Listen for Topbar-dispatched canvas commands
function CanvasCommandListener({ instance }: { instance: ReactFlowInstance<Node, Edge> | null }) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { cmd: 'zoomIn' | 'zoomOut' | 'autoArrange' };
      if (!instance) return;
      const rf = instance as unknown as RFCoreInstance<Node, Edge>;
      if (detail?.cmd === 'zoomIn') {
        const v = rf.getViewport();
        rf.setViewport({ ...v, zoom: Math.min((v.zoom ?? 1) + 0.1, 1.75) });
      } else if (detail?.cmd === 'zoomOut') {
        const v = rf.getViewport();
        rf.setViewport({ ...v, zoom: Math.max((v.zoom ?? 1) - 0.1, 0.25) });
      } else if (detail?.cmd === 'autoArrange') {
        try {
          const nodes = rf.getNodes();
          const edges = rf.getEdges();
          const arranged = simpleAutoLayout(nodes, edges);
          rf.setNodes(arranged);
        } catch (e) {
          // ignore
        }
      }
    };
    window.addEventListener('AGEN8_CANVAS_COMMAND', handler as EventListener);
    return () => window.removeEventListener('AGEN8_CANVAS_COMMAND', handler as EventListener);
  }, [instance]);
  return null;
}

// Simple left-to-right layered layout for a clean auto-arrange
function simpleAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  nodes.forEach(n => { inDegree.set(n.id, 0); graph.set(n.id, []); });
  edges.forEach(e => {
    if (!graph.has(e.source)) graph.set(e.source, []);
    graph.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Kahn-like layering
  const layers: string[][] = [];
  let current = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id);
  const visited = new Set<string>(current);
  while (current.length) {
    layers.push(current);
    const next: string[] = [];
    current.forEach(id => {
      (graph.get(id) || []).forEach(t => {
        if (visited.has(t)) return;
        inDegree.set(t, (inDegree.get(t) || 0) - 1);
        if ((inDegree.get(t) || 0) <= 0) {
          visited.add(t);
          next.push(t);
        }
      });
    });
    current = next;
  }
  // any remaining (cycles), append
  nodes.forEach(n => { if (!visited.has(n.id)) { layers.push([n.id]); visited.add(n.id);} });

  // Positioning (more generous gaps so auto-arrange isn't cramped)
  const xGap = 380; // increased horizontal spacing
  const yGap = 200; // increased vertical spacing
  const startX = 80;
  const startY = 80;
  const idToNode = new Map(nodes.map(n => [n.id, n] as const));
  const newNodes = nodes.map(n => ({ ...n }));
  const byId = new Map(newNodes.map(n => [n.id, n] as const));

  layers.forEach((layer, li) => {
    layer.forEach((id, idx) => {
      const node = byId.get(id);
      if (!node) return;
      node.position = {
        x: startX + li * xGap,
        y: startY + idx * yGap,
      };
    });
  });

  return newNodes;
}

export function WorkflowBuilder() {
  const { 
    workspaces, 
    currentWorkspaceId, 
    currentWorkflowId, 
    isDarkMode,
    setCurrentWorkspace,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    setCurrentWorkflow,
    setSelectedNode,
    isExecuting,
    clearExecution,
    addExecutionLog,
    leftSidebarVisible,
    openRightPanel
  } = useAppStore();

  const { leftSidebarCollapsed } = useAppStore();

  const nodeTypes = useDynamicNodeTypes();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  type RFInstance = ReactFlowInstance<Node, Edge>;
  const [reactFlowInstance, setReactFlowInstance] = useState<RFInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Prevent deleting the starter node via keyboard/backspace in canvas
  const onNodesChangeSafe: OnNodesChange = (changes) => {
    const filtered = changes.filter((ch) => {
      if (ch.type !== 'remove') return true;
      const id = (ch as any).id as string | undefined;
      if (!id) return true;
      if (id === 'starter') return false;
      const n = nodes.find(n => n.id === id);
      return n?.type !== 'starter';
    });
    onNodesChange(filtered);
  };

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);

  // First-run bootstrap: ensure a workspace and a starter workflow exist
  useEffect(() => {
    if (workspaces.length === 0) {
      createWorkspace('My Workspace');
      return;
    }
    if (!currentWorkspaceId) {
      setCurrentWorkspace(workspaces[0].id);
      return;
    }
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (ws && ws.workflows.length === 0) {
      createWorkflow(ws.id, 'New Workflow');
      return;
    }
    if (ws && !currentWorkflowId && ws.workflows.length > 0) {
      setCurrentWorkflow(ws.workflows[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, currentWorkspaceId, currentWorkflowId]);

  // Check if user wants to restore full builder
  const shouldRestoreFullBuilder = window.location.hash === '#restore-full-builder' || 
                                   localStorage.getItem('AGEN8-force-full-builder') === 'true';

  // Decide whether to show recovery interface or the full builder (must not change hook order)
  const showRecovery = false;

  // Guard to prevent save-effect from immediately overwriting external store updates
  const syncingFromStoreRef = useRef(false);

  // Load workflow data into React Flow
  useEffect(() => {
    if (currentWorkflow) {
      // Ensure a starter node exists
      let wf = currentWorkflow;
      const starterExists = wf.nodes.some(n => n.id === wf.starterId && n.type === 'starter');
      if (!starterExists) {
        const starterNode = { id: 'starter', type: 'starter', position: { x: 100, y: 100 }, data: {} };
        wf = { ...wf, nodes: [starterNode, ...wf.nodes], starterId: 'starter', updatedAt: new Date().toISOString() };
        if (currentWorkspaceId) updateWorkflow(currentWorkspaceId, wf);
      }

      const flowNodes = wf.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));
      
      const flowEdges = wf.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'default',
      }));
      
      // mark syncing to avoid save-effect race
      syncingFromStoreRef.current = true;
      setNodes(flowNodes);
      setEdges(flowEdges);

      // Clear sync flag after applying store changes, defer to next frame to
      // avoid save-effect overwriting freshly loaded data
      requestAnimationFrame(() => {
        syncingFromStoreRef.current = false;
      });
    }
  }, [currentWorkflow, setNodes, setEdges, currentWorkspaceId, updateWorkflow, reactFlowInstance]);

  // Save workflow changes (avoid loops while typing)
  useEffect(() => {
    if (!currentWorkflow || !reactFlowInstance) return;

    // Avoid saving while actively typing in a node
    if (useAppStore.getState().isNodeEditing) return;

    // Skip save if we're applying external store changes to local state
    if (syncingFromStoreRef.current) return;

    // Only persist if there are actual differences
    const workflowNodes: WfNode[] = nodes.map(node => ({
      id: node.id,
      type: node.type!,
      position: node.position,
      data: node.data || {},
    }));

    const workflowEdges: WfEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
    }));

    const nodesChanged = JSON.stringify(workflowNodes) !== JSON.stringify(currentWorkflow.nodes);
    const edgesChanged = JSON.stringify(workflowEdges) !== JSON.stringify(currentWorkflow.edges);

    if (!(nodesChanged || edgesChanged)) return;

    const updated: WorkflowType = {
      ...currentWorkflow,
      nodes: workflowNodes,
      edges: workflowEdges,
      updatedAt: new Date().toISOString(),
    };
    if (currentWorkspaceId) {
      updateWorkflow(currentWorkspaceId, updated);
    }
  }, [nodes, edges, currentWorkflow, reactFlowInstance, updateWorkflow, currentWorkspaceId]);

  // Respect user's zoom: do not auto-fit on node additions
  // (kept a counter in case we need future heuristics)
  const prevNodesCountRef = useRef<number>(0);
  useEffect(() => {
    prevNodesCountRef.current = nodes.length;
  }, [nodes]);

  const onConnect = (connection: Connection) => {
    const edge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: 'default',
    };
    setEdges(eds => addEdge(edge, eds));
  };

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  };

  // Ctrl+K opens Copilot panel
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    openRightPanel('copilot');
  }, [openRightPanel]);

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();

    if (!reactFlowInstance || !reactFlowWrapper.current) return;

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    // Prevent adding another Start node via drag
    if (type === 'starter') return;

    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    const blockConfig = getBlockConfig(type);
    if (!blockConfig) return;

    const baseData = {
      label: blockConfig.name,
      ...Object.fromEntries(
        (blockConfig.subBlocks || []).map(sb => [sb.id, defaultValueForField(sb.type)])
      ),
    } as Record<string, unknown>;

    // Sensible defaults for API block so it runs out of the box
    if (type === 'api') {
      if (!baseData.method) baseData.method = 'GET';
      if (!baseData.url) baseData.url = 'https://example.com/';
      if (!baseData.timeout) baseData.timeout = 30000;
      if (!baseData.headers) baseData.headers = '{}';
    }

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: baseData,
    };

    setNodes(nds => {
      const updated = [...nds, newNode];
      // Auto-connect: prefer selected node -> new node; else last placed -> new node; else starter -> new node
      const selected = updated.find(n => n.id === useAppStore.getState().selectedNodeId);
      const lastPlaced = nds[nds.length - 1];
      const starter = updated.find(n => n.id === 'starter') || nds.find(n => n.id === 'starter');
      const fromNode = selected && selected.id !== newNode.id
        ? selected
        : (lastPlaced && lastPlaced.id !== newNode.id ? lastPlaced : starter);
      if (fromNode && fromNode.id !== newNode.id) {
        setEdges(eds => addEdge({ id: `edge-${fromNode.id}-${newNode.id}`, source: fromNode.id, target: newNode.id, type: 'default' }, eds));
      }
      return updated;
    });

    // Respect user's zoom: no auto-fit after drop
  };

  function defaultValueForField(fieldType: string): unknown {
    switch (fieldType) {
      case 'short-input':
      case 'long-input':
      case 'code':
        return '';
      case 'number':
        return 0;
      case 'toggle':
        return false;
      case 'combobox':
        return '';
      case 'datetime':
        return '';
      default:
        return '';
    }
  }

  const handleExecuteWorkflow = async () => {
    if (!currentWorkflow) return;
    
  clearExecution();
    
    try {
      await executeWorkflow(
        currentWorkflow,
        {},
        (log) => {
          addExecutionLog(log);
        }
      );
    } catch (error) {
      addExecutionLog({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId: undefined,
      });
    }
  };

  const renderRecovery = () => (
    <div className={`h-screen flex flex-col bg-background ${isDarkMode ? 'dark' : ''}`}>
      <div className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold">🎉 AGEN8 - Recovery Mode</h1>
        <p className="text-sm text-muted-foreground">Let's get your work back!</p>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-80 h-full min-h-0 border-r border-border bg-card overflow-hidden p-4">
          <h2 className="text-md font-medium mb-4">Data Recovery</h2>
          <p className="text-sm text-muted-foreground mb-2">✅ Total Workspaces: {workspaces.length}</p>
          <p className="text-sm text-muted-foreground mb-4">✅ Current: {currentWorkspace?.name || 'None'}</p>
          <div className="space-y-2">
            {workspaces.filter(ws => ws.workflows.length > 0).length > 0 ? (
              <>
                <h3 className="text-sm font-medium mb-2">Workspaces with Data:</h3>
                {workspaces
                  .filter(ws => ws.workflows.length > 0)
                  .slice(0, 3)
                  .map((ws, index) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setCurrentWorkspace(ws.id);
                        if (ws.workflows.length > 0) {
                          setCurrentWorkflow(ws.workflows[0].id);
                        }
                        localStorage.setItem('AGEN8-force-full-builder', 'true');
                        window.location.hash = 'restore-full-builder';
                        setTimeout(() => window.location.reload(), 100);
                      }}
                      className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-sm mb-2"
                    >
                      <div className="font-medium text-blue-900">📁 {ws.name} #{index + 1}</div>
                      <div className="text-blue-700 text-xs">{ws.workflows.length} workflows • {ws.workflows[0]?.nodes?.length || 0} nodes</div>
                      <div className="text-blue-600 text-xs mt-1">Click to restore this workspace</div>
                    </button>
                  ))}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No existing workflows found.</p>
                <button
                  onClick={() => {
                    if (currentWorkspace && currentWorkspace.workflows.length === 0) {
                      createWorkflow(currentWorkspace.id, 'New Workflow');
                    }
                    localStorage.setItem('AGEN8-force-full-builder', 'true');
                    window.location.hash = 'restore-full-builder';
                    setTimeout(() => window.location.reload(), 100);
                  }}
                  className="w-full p-3 bg-primary text-primary-foreground rounded font-medium"
                >
                  🚀 Start Fresh with Full AI FlowKit
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 relative min-h-0 flex items-center justify-center bg-canvas-bg">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Welcome Back to AGEN8!</h2>
            <p className="text-muted-foreground mb-4">Your sim.ai-inspired workflow builder</p>
            <p className="text-sm text-muted-foreground">Select a workspace or start fresh to continue</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (showRecovery) {
    return renderRecovery();
  }

  if (!currentWorkspace) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No workspace selected</h2>
          <p className="text-muted-foreground">Please select or create a workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-background ${isDarkMode ? 'dark' : ''}`}>
      <Topbar 
        onExecute={handleExecuteWorkflow}
        isExecuting={isExecuting}
      />
      
      <div className="flex-1 flex min-h-0">
        {leftSidebarVisible && !leftSidebarCollapsed && (
          <div className="w-80 shrink-0">
            <Palette />
          </div>
        )}
        
        <div className="flex-1 relative min-h-0" ref={reactFlowWrapper}
             onContextMenu={(e) => e.preventDefault() /* disable native menu */}>
          {/* Canvas command listeners */}
          <CanvasCommandListener instance={reactFlowInstance} />
          {/* Floating compact header when collapsed */}
          {leftSidebarVisible && leftSidebarCollapsed && (
            <div className="absolute left-0 top-0 z-20">
              <div className="w-80">
                <div className="p-3">
                  <Card className="p-3 flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{currentWorkspace?.name || 'My Workspace'}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => useAppStore.getState().toggleLeftSidebarCollapsed()}
                      aria-label="Expand sidebar"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Card>
                </div>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeSafe}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={(instance) => setReactFlowInstance(instance as RFInstance)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={false}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.25}
            maxZoom={1.75}
            panOnScroll={true}
            panOnDrag={[1, 2]}
            selectionOnDrag={true}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            connectOnClick={false}
            snapToGrid={true}
            snapGrid={[16, 16]}
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              color="#e5e7eb" 
              variant="dots" 
              gap={16} 
              size={1}
              className="dark:opacity-20"
            />
          </ReactFlow>
        </div>
        
  {/* Right panel renders only when opened from Topbar */}
  <RightPanel />
      </div>
    </div>
  );
}
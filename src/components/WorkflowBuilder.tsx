import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, Edge, Node, OnNodesChange, OnEdgesChange, NodeChange, EdgeChange } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';
import type { NodeTypes as RFNodeTypes, NodeProps as RFNodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/lib/store';
import { Palette } from './Palette';
import { Topbar } from './Topbar';
import { ExecutionLog } from './ExecutionLog';
import { Copilot } from './Copilot';
import { RightPanel } from './RightPanel';
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
    addExecutionLog
  } = useAppStore();

  const nodeTypes = useDynamicNodeTypes();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  type RFInstance = ReactFlowInstance<Node, Edge>;
  const [reactFlowInstance, setReactFlowInstance] = useState<RFInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);

  // Check if user wants to restore full builder
  const shouldRestoreFullBuilder = window.location.hash === '#restore-full-builder' || 
                                   localStorage.getItem('ai-flowkit-force-full-builder') === 'true';

  // Decide whether to show recovery interface or the full builder (must not change hook order)
  const showRecovery = !currentWorkspace || (!shouldRestoreFullBuilder && (!currentWorkflow || currentWorkflow.nodes.length === 0));

  // Load workflow data into React Flow
  useEffect(() => {
    if (currentWorkflow) {
      const flowNodes = currentWorkflow.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      }));
      
      const flowEdges = currentWorkflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: 'default',
      }));
      
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [currentWorkflow, setNodes, setEdges]);

  // Save workflow changes
  useEffect(() => {
    if (currentWorkflow && reactFlowInstance) {
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
      
      const updated: WorkflowType = {
        ...currentWorkflow,
        nodes: workflowNodes,
        edges: workflowEdges,
        updatedAt: new Date().toISOString(),
      };
      if (currentWorkspaceId) {
        updateWorkflow(currentWorkspaceId, updated);
      }
    }
  }, [nodes, edges, currentWorkflow, reactFlowInstance, updateWorkflow, currentWorkspaceId]);

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

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();

    if (!reactFlowInstance || !reactFlowWrapper.current) return;

    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });

    const blockConfig = getBlockConfig(type);
    if (!blockConfig) return;

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        label: blockConfig.name,
        ...Object.fromEntries(
          blockConfig.subBlocks?.map(sb => [sb.id, '']) || []
        ),
      },
    };

    setNodes(nds => [...nds, newNode]);
  };

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
        <h1 className="text-lg font-semibold">🎉 AI FlowKit - Recovery Mode</h1>
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
                        localStorage.setItem('ai-flowkit-force-full-builder', 'true');
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
                    localStorage.setItem('ai-flowkit-force-full-builder', 'true');
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
            <h2 className="text-xl font-semibold mb-2">Welcome Back to AI FlowKit!</h2>
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
        <Palette />
        
        <div className="flex-1 relative min-h-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={(instance) => setReactFlowInstance(instance as RFInstance)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView={false}
            className="bg-canvas-bg"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.5}
            maxZoom={2}
          >
            <Background />
          </ReactFlow>
        </div>
        
  {/* Right panel renders only when opened from Topbar */}
  <RightPanel />
      </div>
    </div>
  );
}
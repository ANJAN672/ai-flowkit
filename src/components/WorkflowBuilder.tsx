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
import { getAllBlocks, getBlockConfig } from '@/lib/blocks/registry';
import { WorkflowNode } from './nodes/WorkflowNode';
import { executeWorkflow } from '@/lib/execution/engine';
import type { Workflow as WorkflowType, WorkflowNode as WfNode, WorkflowEdge as WfEdge } from '@/lib/types';

// Support all registered blocks without changing visual node design
// by mapping every block type to the same WorkflowNode component.
// This fixes drag-and-drop for integration blocks too.
const useDynamicNodeTypes = () =>
  useMemo((): RFNodeTypes => {
    const entries = getAllBlocks().map((b) => [b.type, WorkflowNode] as const);
    // Ensure core types exist even if registry changes
    const base: RFNodeTypes = {
      starter: WorkflowNode as unknown as ComponentType<RFNodeProps>,
      agent: WorkflowNode as unknown as ComponentType<RFNodeProps>,
      api: WorkflowNode as unknown as ComponentType<RFNodeProps>,
      condition: WorkflowNode as unknown as ComponentType<RFNodeProps>,
      response: WorkflowNode as unknown as ComponentType<RFNodeProps>,
      function: WorkflowNode as unknown as ComponentType<RFNodeProps>,
    };
    for (const [key] of entries) base[key] = WorkflowNode as unknown as ComponentType<RFNodeProps>;
    return base;
  }, []);

export function WorkflowBuilder() {
  const {
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    createWorkflow,
    setCurrentWorkflow,
  updateWorkflow,
    showExecutionLog,
    showCopilot,
    isDarkMode
  } = useAppStore();

  const [nodes, setNodes, baseOnNodesChange] = useNodesState([]);
  const [edges, setEdges, baseOnEdgesChange] = useEdgesState([]);

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);

  const nodeTypes = useDynamicNodeTypes();
  type RFNode = Node<Record<string, unknown>, string>;
  type RFEdge = Edge;
  const rfInstance = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);

  useEffect(() => {
    if (currentWorkspace && !currentWorkflowId && currentWorkspace.workflows.length === 0) {
      createWorkflow(currentWorkspace.id, 'New Workflow');
    }
  }, [currentWorkspace, currentWorkflowId, createWorkflow]);

  useEffect(() => {
    if (currentWorkflow) {
      // Convert workflow nodes to React Flow nodes
      const flowNodes = currentWorkflow.nodes.map(node => {
        const blockConfig = getBlockConfig(node.type);
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            label: blockConfig?.name || node.type,
            blockConfig
          }
        };
      });

      setNodes(flowNodes);
      setEdges(currentWorkflow.edges.map(edge => ({
        ...edge,
        animated: false
      })));
    }
  }, [currentWorkflow, setNodes, setEdges]);

  const onConnect = (params: Connection) => {
  // Create a stable id for the new edge and update both UI and store
  const edgeId = `e-${params.source}-${params.target}-${Date.now()}`;
  setEdges((eds) => addEdge({ ...params, id: edgeId }, eds));
  if (currentWorkspace && currentWorkflow && params.source && params.target) {
    const newEdge: WfEdge = {
      id: edgeId,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    };
    const updatedWf: WorkflowType = { ...currentWorkflow, edges: [...currentWorkflow.edges, newEdge] } as WorkflowType;
    updateWorkflow(currentWorkspace.id, updatedWf);
  }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    
    if (!type) return;

    const position = rfInstance.current
      ? rfInstance.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : { x: event.clientX, y: event.clientY };

    const blockConfig = getBlockConfig(type);
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {
        label: blockConfig?.name || type,
        blockConfig,
        // Initialize with default values
        ...Object.fromEntries(
          blockConfig?.subBlocks?.map(field => [field.id, '']) || []
        )
      }
    };

    setNodes((nds) => nds.concat(newNode));
    // Persist newly added node to the store so engine sees it
    if (currentWorkspace && currentWorkflow) {
      // Strip UI-only fields
      const { label: _label, blockConfig: _bc, ...persistData } = newNode.data as Record<string, unknown>;
      const wfNode: WfNode = {
        id: newNode.id,
        type: newNode.type || 'default',
        position: newNode.position,
        data: { ...persistData } as Record<string, unknown>
      };
  const updatedNodes = [...currentWorkflow.nodes, wfNode];
  const updatedEdges = [...currentWorkflow.edges];

      // Auto-connect from starter to first dropped node if no connection exists yet
      const starterId = currentWorkflow.starterId;
      const hasStarter = updatedNodes.some(n => n.id === starterId);
      const alreadyConnected = updatedEdges.some(e => e.source === starterId && e.target === wfNode.id);
      if (hasStarter && !alreadyConnected && wfNode.id !== starterId) {
        const newEdge: WfEdge = {
          id: `e-${starterId}-${wfNode.id}-${Date.now()}`,
          source: starterId,
          target: wfNode.id
        };
        updatedEdges.push(newEdge);
        // Also add to UI edges immediately
        setEdges((eds) => addEdge({ id: newEdge.id, source: newEdge.source, target: newEdge.target }, eds));
      }

      const updatedWf: WorkflowType = { ...currentWorkflow, nodes: updatedNodes, edges: updatedEdges } as WorkflowType;
      updateWorkflow(currentWorkspace.id, updatedWf);
    }
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  // Persist node/edge changes back to the store
  const onNodesChange: OnNodesChange = (changes: NodeChange[]) => {
    baseOnNodesChange(changes);
    if (!currentWorkspace || !currentWorkflow) return;
    // React Flow already applied changes via baseOnNodesChange; pick up latest state next tick
    queueMicrotask(() => {
      const wfNodes: WfNode[] = (nodes as Node[]).map(n => {
        const { label: _label, blockConfig: _bc, ...persistData } = (n.data as Record<string, unknown>) || {};
        return {
          id: n.id,
          type: n.type || 'default',
          position: n.position,
          data: { ...persistData } as Record<string, unknown>
        };
      });
      const updatedWf: WorkflowType = { ...currentWorkflow, nodes: wfNodes } as WorkflowType;
      updateWorkflow(currentWorkspace.id, updatedWf);
    });
  };

  const onEdgesChange: OnEdgesChange = (changes: EdgeChange[]) => {
    baseOnEdgesChange(changes);
    if (!currentWorkspace || !currentWorkflow) return;
    queueMicrotask(() => {
      const wfEdges: WfEdge[] = (edges as Edge[]).map(e => ({
        id: e.id!,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: typeof (e as unknown as { label?: unknown }).label === 'string' ? (e as unknown as { label?: string }).label : undefined
      }));
      const updatedWf: WorkflowType = { ...currentWorkflow, edges: wfEdges } as WorkflowType;
      updateWorkflow(currentWorkspace.id, updatedWf);
    });
  };

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
      <Topbar />
      
      <div className="flex-1 flex">
  {/* Left Palette */}
  <div className="w-80 h-full border-r border-border bg-card overflow-hidden">
          <Palette />
        </div>

        {/* Center Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            onInit={(instance) => { rfInstance.current = instance as ReactFlowInstance<RFNode, RFEdge>; }}
            className="bg-canvas-bg"
          >
            <Background 
              color="hsl(var(--canvas-grid))"
              size={2}
              gap={20}
            />
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              nodeColor="hsl(var(--primary))"
              className="bg-card border border-border rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* Right Panels (Logs top, Copilot bottom) */}
        {(showExecutionLog || showCopilot) && (
          <div className="w-80 border-l border-border bg-card flex flex-col">
            {showExecutionLog && (
              <div className={showCopilot ? "basis-2/3 min-h-[220px] border-b border-border" : "flex-1"}>
                <ExecutionLog />
              </div>
            )}
            {showCopilot && (
              <div className={showExecutionLog ? "basis-1/3 min-h-[200px]" : "flex-1"}>
                <Copilot />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
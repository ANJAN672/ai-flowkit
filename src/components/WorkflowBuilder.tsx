import { useEffect, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/lib/store';
import { Palette } from './Palette';
import { PropertiesPanel } from './PropertiesPanel';
import { Topbar } from './Topbar';
import { ExecutionLog } from './ExecutionLog';
import { Copilot } from './Copilot';
import { getBlockConfig } from '@/lib/blocks/registry';
import { WorkflowNode } from './nodes/WorkflowNode';
import { executeWorkflow } from '@/lib/execution/engine';

const nodeTypes = {
  starter: WorkflowNode,
  agent: WorkflowNode,
  api: WorkflowNode,
  condition: WorkflowNode,
  response: WorkflowNode,
  function: WorkflowNode,
};

export function WorkflowBuilder() {
  const {
    workspaces,
    currentWorkspaceId,
    currentWorkflowId,
    createWorkflow,
    setCurrentWorkflow,
    showExecutionLog,
    showCopilot,
    isDarkMode
  } = useAppStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId);
  const currentWorkflow = currentWorkspace?.workflows.find(wf => wf.id === currentWorkflowId);

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
    setEdges((eds) => addEdge(params, eds));
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    
    if (!type) return;

    const position = {
      x: event.clientX - reactFlowBounds.left - 100,
      y: event.clientY - reactFlowBounds.top - 50,
    };

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
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
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
        <div className="w-80 border-r border-border bg-card">
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
            fitView
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

        {/* Right Panels */}
        <div className="flex">
          {/* Properties Panel */}
          <div className="w-80 border-l border-border bg-card">
            <PropertiesPanel />
          </div>

          {/* Copilot Panel */}
          {showCopilot && (
            <div className="w-80 border-l border-border bg-card">
              <Copilot />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Execution Log */}
      {showExecutionLog && (
        <div className="h-80 border-t border-border">
          <ExecutionLog />
        </div>
      )}
    </div>
  );
}
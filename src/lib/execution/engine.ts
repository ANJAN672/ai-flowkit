import { Workflow, RunContext, ExecutionLog, NodeExecution, WorkflowExecution } from '../types';
import { getBlockConfig } from '../blocks/registry';

export class ExecutionEngine {
  private abortController: AbortController | null = null;
  private onLog?: (log: ExecutionLog) => void;
  private onNodeUpdate?: (nodeId: string, execution: NodeExecution) => void;

  constructor(
    onLog?: (log: ExecutionLog) => void,
    onNodeUpdate?: (nodeId: string, execution: NodeExecution) => void
  ) {
    this.onLog = onLog;
    this.onNodeUpdate = onNodeUpdate;
  }

  async executeWorkflow(workflow: Workflow, env: Record<string, string> = {}): Promise<WorkflowExecution> {
    this.abortController = new AbortController();
    
    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId: workflow.id,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      nodeExecutions: {}
    };

    this.log(execution, 'info', `Starting workflow: ${workflow.name}`);

    try {
      // Validate workflow
      this.validateWorkflow(workflow);

  // Create execution context
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
      
      // Execute nodes in topological order (simplified for MVP)
      const startNode = workflow.nodes.find(node => node.id === workflow.starterId);
      if (!startNode) {
        throw new Error('Start node not found');
      }

      // Execute reachable graph in BFS order from the starter
      const visited = new Set<string>();
      const queue: string[] = [startNode.id];

      while (queue.length > 0) {
        if (this.abortController?.signal.aborted) {
          execution.status = 'cancelled';
          break;
        }

        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = workflow.nodes.find(n => n.id === nodeId);
        if (!node) continue;

  await this.executeNode(workflow, node, execution, env, nodeOutputs);

        const nextNodes = this.getConnectedNodes(workflow, nodeId);
        for (const n of nextNodes) {
          if (!visited.has(n.id)) queue.push(n.id);
        }
      }

      if (execution.status !== 'cancelled') {
        execution.status = 'success';
        this.log(execution, 'info', 'Workflow completed successfully');
      }

    } catch (error) {
      execution.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(execution, 'error', `Workflow failed: ${errorMessage}`);
    }

    execution.endTime = new Date().toISOString();
    execution.duration = new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime();

    return execution;
  }

  private async executeNode(
    workflow: Workflow,
    node: { id: string; type: string; data: Record<string, unknown> },
    execution: WorkflowExecution,
    env: Record<string, string>,
    nodeOutputs: Record<string, Record<string, unknown>>
  ): Promise<void> {
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      status: 'running',
      startTime: new Date().toISOString()
    };

    execution.nodeExecutions[node.id] = nodeExecution;
    this.onNodeUpdate?.(node.id, nodeExecution);

    try {
      this.log(execution, 'info', `Executing node: ${node.id}`, node.id);

  const blockConfig = getBlockConfig(node.type);
      if (!blockConfig || !blockConfig.run) {
        throw new Error(`Block type ${node.type} not found or not executable`);
      }

      // Create run context
      const context: RunContext = {
        workflowId: workflow.id,
        nodeId: node.id,
        inputs: node.data,
        env,
        fetch: this.createFetchWithTimeout(this.abortController!.signal),
        log: (message: unknown) => this.log(execution, 'info', String(message), node.id),
        getNodeOutput: (nodeId: string, key?: string) => {
          const outputs = nodeOutputs[nodeId];
          return key ? outputs?.[key] : outputs;
        },
        setNodeOutput: (key: string, value: unknown) => {
          if (!nodeOutputs[node.id]) {
            nodeOutputs[node.id] = {};
          }
          nodeOutputs[node.id][key] = value;
        },
        abortSignal: this.abortController!.signal
      };

      // Execute the block
      const result = await blockConfig.run(context);

      nodeExecution.status = 'success';
      nodeExecution.outputs = (result && typeof result === 'object' && !Array.isArray(result))
        ? (result as Record<string, unknown>)
        : { value: result };
      nodeExecution.endTime = new Date().toISOString();
      nodeExecution.duration = new Date(nodeExecution.endTime).getTime() - new Date(nodeExecution.startTime).getTime();

      // Auto-propagate object-like results to nodeOutputs so downstream nodes can read them via getNodeOutput
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        nodeOutputs[node.id] = {
          ...(nodeOutputs[node.id] || {}),
          ...(result as Record<string, unknown>),
        };
      }

      this.log(execution, 'info', `Node completed in ${nodeExecution.duration}ms`, node.id);

    } catch (error) {
      nodeExecution.status = 'error';
      nodeExecution.error = error instanceof Error ? error.message : 'Unknown error';
      nodeExecution.endTime = new Date().toISOString();
      nodeExecution.duration = new Date(nodeExecution.endTime).getTime() - new Date(nodeExecution.startTime).getTime();

      this.log(execution, 'error', `Node failed: ${nodeExecution.error}`, node.id);
      throw error;
    }

    this.onNodeUpdate?.(node.id, nodeExecution);
  }

  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    const startNode = workflow.nodes.find(node => node.id === workflow.starterId);
    if (!startNode) {
      throw new Error('Start node not found');
    }

    // Additional validation could go here
  }

  private getConnectedNodes(workflow: Workflow, fromNodeId: string): Array<{ id: string; type: string; data: Record<string, unknown> }> {
    const connectedNodeIds = workflow.edges
      .filter(edge => edge.source === fromNodeId)
      .map(edge => edge.target);

    return workflow.nodes
      .filter(node => connectedNodeIds.includes(node.id))
      .map(n => ({ id: n.id, type: n.type, data: n.data as Record<string, unknown> }));
  }

  private createFetchWithTimeout(engineSignal?: AbortSignal): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      // Tie request to engine abort as well
      const onEngineAbort = () => controller.abort();
      try {
        if (engineSignal) {
          if (engineSignal.aborted) controller.abort();
          else engineSignal.addEventListener('abort', onEngineAbort);
        }

        const response = await fetch(input, {
          ...init,
          signal: init?.signal ?? controller.signal,
        });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      } finally {
        if (engineSignal) engineSignal.removeEventListener('abort', onEngineAbort);
      }
    };
  }

  private log(execution: WorkflowExecution, level: 'info' | 'warn' | 'error', message: string, nodeId?: string): void {
    const log: ExecutionLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      nodeId,
      message,
      level,
      timestamp: new Date().toISOString()
    };

    execution.logs.push(log);
    this.onLog?.(log);
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

export async function executeWorkflow(
  workflow: Workflow,
  env: Record<string, string> = {},
  onLog?: (log: ExecutionLog) => void,
  onNodeUpdate?: (nodeId: string, execution: NodeExecution) => void
): Promise<WorkflowExecution> {
  const engine = new ExecutionEngine(onLog, onNodeUpdate);
  return engine.executeWorkflow(workflow, env);
}

// Starts a workflow and returns the engine instance and the running promise.
// Use engine.stop() to cancel.
export function startWorkflow(
  workflow: Workflow,
  env: Record<string, string> = {},
  onLog?: (log: ExecutionLog) => void,
  onNodeUpdate?: (nodeId: string, execution: NodeExecution) => void
): { engine: ExecutionEngine; promise: Promise<WorkflowExecution> } {
  const engine = new ExecutionEngine(onLog, onNodeUpdate);
  const promise = engine.executeWorkflow(workflow, env);
  return { engine, promise };
}
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
      const nodeOutputs: Record<string, Record<string, any>> = {};
      
      // Execute nodes in topological order (simplified for MVP)
      const startNode = workflow.nodes.find(node => node.id === workflow.starterId);
      if (!startNode) {
        throw new Error('Start node not found');
      }

      // For MVP, execute in simple sequence: starter -> connected nodes
      await this.executeNode(workflow, startNode, execution, env, nodeOutputs);

      // Find connected nodes and execute them
      const connectedNodes = this.getConnectedNodes(workflow, startNode.id);
      for (const node of connectedNodes) {
        if (this.abortController?.signal.aborted) {
          execution.status = 'cancelled';
          break;
        }
        await this.executeNode(workflow, node, execution, env, nodeOutputs);
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
    node: any,
    execution: WorkflowExecution,
    env: Record<string, string>,
    nodeOutputs: Record<string, Record<string, any>>
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
        fetch: this.createFetchWithTimeout(),
        log: (message: any) => this.log(execution, 'info', String(message), node.id),
        getNodeOutput: (nodeId: string, key?: string) => {
          const outputs = nodeOutputs[nodeId];
          return key ? outputs?.[key] : outputs;
        },
        setNodeOutput: (key: string, value: any) => {
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
      nodeExecution.outputs = result;
      nodeExecution.endTime = new Date().toISOString();
      nodeExecution.duration = new Date(nodeExecution.endTime).getTime() - new Date(nodeExecution.startTime).getTime();

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

  private getConnectedNodes(workflow: Workflow, fromNodeId: string): any[] {
    const connectedNodeIds = workflow.edges
      .filter(edge => edge.source === fromNodeId)
      .map(edge => edge.target);

    return workflow.nodes.filter(node => connectedNodeIds.includes(node.id));
  }

  private createFetchWithTimeout(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
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
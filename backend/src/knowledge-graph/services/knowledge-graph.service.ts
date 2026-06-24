import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DependencyEdge } from '../../repository/entities/dependency-edge.entity';
import { Task } from '../../tasks/entities/task.entity';
import { TaskAnalysis } from '../../tasks/entities/task-analysis.entity';
import { TaskTest } from '../../tasks/entities/task-test.entity';

export interface GraphNode {
  id: string;
  type: 'file' | 'task' | 'test';
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface KnowledgeGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { files: number; tasks: number; tests: number; relations: number };
}

@Injectable()
export class KnowledgeGraphService {
  constructor(
    @InjectRepository(DependencyEdge)
    private readonly edgeRepo: Repository<DependencyEdge>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAnalysis)
    private readonly analysisRepo: Repository<TaskAnalysis>,
    @InjectRepository(TaskTest)
    private readonly testRepo: Repository<TaskTest>,
  ) {}

  async buildGraph(projectId: string): Promise<KnowledgeGraphResult> {
    const [edges, tasks] = await Promise.all([
      this.edgeRepo.find({ where: { projectId } }),
      this.taskRepo.find({ where: { projectId }, order: { createdAt: 'DESC' }, take: 30 }),
    ]);

    const taskIds = tasks.map((t) => t.id);
    const analyses = taskIds.length
      ? await this.analysisRepo
          .createQueryBuilder('a')
          .where('a.task_id IN (:...taskIds)', { taskIds })
          .getMany()
      : [];
    const tests = taskIds.length
      ? await this.testRepo
          .createQueryBuilder('t')
          .where('t.task_id IN (:...taskIds)', { taskIds })
          .getMany()
      : [];

    const nodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];
    const fileNodeIds = new Set<string>();

    const addFileNode = (filePath: string) => {
      const id = `file:${filePath}`;
      if (fileNodeIds.has(id)) return id;
      fileNodeIds.add(id);
      const short = filePath.split('/').slice(-2).join('/');
      nodes.push({
        id,
        type: 'file',
        label: short,
        data: { filePath, fullPath: filePath },
      });
      return id;
    };

    for (const edge of edges.slice(0, 500)) {
      const sourceId = addFileNode(edge.sourceFile);
      const targetId = addFileNode(edge.targetFile);
      graphEdges.push({
        id: `dep:${edge.id}`,
        source: sourceId,
        target: targetId,
        type: 'dependency',
        label: edge.relationType,
      });
    }

    const analysisByTask = new Map(analyses.map((a) => [a.taskId, a]));
    const testsByTask = new Map(tests.map((t) => [t.taskId, t]));

    tasks.forEach((task, idx) => {
      const taskNodeId = `task:${task.id}`;
      nodes.push({
        id: taskNodeId,
        type: 'task',
        label: task.taskId,
        data: {
          taskId: task.taskId,
          status: task.status,
          risk: task.risk,
          requirement: task.requirement.slice(0, 120),
        },
        position: { x: 50 + (idx % 5) * 180, y: 400 + Math.floor(idx / 5) * 120 },
      });

      const analysis = analysisByTask.get(task.id);
      for (const file of analysis?.impactedFiles || []) {
        const path = typeof file === 'string' ? file : (file as { path?: string }).path;
        if (!path) continue;
        const fileId = addFileNode(path);
        graphEdges.push({
          id: `impact:${task.id}:${path}`,
          source: taskNodeId,
          target: fileId,
          type: 'task_impact',
          label: 'impacts',
        });
      }

      const testEntity = testsByTask.get(task.id);
      const caseCount = testEntity?.qaTestCases?.length || testEntity?.functionalTests?.length || 0;
      if (caseCount > 0) {
        const testNodeId = `test:${task.id}`;
        nodes.push({
          id: testNodeId,
          type: 'test',
          label: `${caseCount} tests`,
          data: { taskId: task.taskId, caseCount },
        });
        graphEdges.push({
          id: `tests:${task.id}`,
          source: taskNodeId,
          target: testNodeId,
          type: 'task_tests',
          label: 'validates',
        });
      }
    });

    this.applyLayout(nodes);

    return {
      nodes,
      edges: graphEdges,
      stats: {
        files: fileNodeIds.size,
        tasks: tasks.length,
        tests: nodes.filter((n) => n.type === 'test').length,
        relations: graphEdges.length,
      },
    };
  }

  private applyLayout(nodes: GraphNode[]): void {
    const files = nodes.filter((n) => n.type === 'file');
    const cols = Math.ceil(Math.sqrt(files.length)) || 1;
    files.forEach((node, i) => {
      node.position = {
        x: (i % cols) * 160,
        y: Math.floor(i / cols) * 80,
      };
    });
  }
}

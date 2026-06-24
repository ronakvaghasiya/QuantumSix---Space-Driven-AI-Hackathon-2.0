'use client';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography, Stack, Chip } from '@mui/material';
import { useMemo } from 'react';
import type { KnowledgeGraphResult } from '@/lib/api';

const NODE_COLORS: Record<string, string> = {
  file: '#00A76F',
  task: '#8E33FF',
  test: '#22C55E',
};

interface KnowledgeGraphFlowProps {
  data: KnowledgeGraphResult | null;
  height?: number;
}

export function KnowledgeGraphFlow({ data, height = 520 }: KnowledgeGraphFlowProps) {
  const { nodes, edges } = useMemo(() => {
    if (!data?.nodes?.length) return { nodes: [] as Node[], edges: [] as Edge[] };

    const flowNodes: Node[] = data.nodes.map((n, i) => ({
      id: n.id,
      type: 'default',
      position: n.position || { x: (i % 8) * 140, y: Math.floor(i / 8) * 90 },
      data: { label: n.label },
      style: {
        background: NODE_COLORS[n.type] || '#607d8b',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 11,
        padding: '6px 10px',
        maxWidth: 160,
      },
    }));

    const flowEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: e.type === 'task_impact',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: e.type === 'dependency' ? '#90a4ae' : '#ab47bc' },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  if (!data?.nodes?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No graph data. Index the repository and run tasks to populate the knowledge graph.
      </Typography>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`${data.stats.files} files`} size="small" color="primary" variant="outlined" />
        <Chip label={`${data.stats.tasks} tasks`} size="small" color="secondary" variant="outlined" />
        <Chip label={`${data.stats.relations} edges`} size="small" variant="outlined" />
      </Stack>
      <Box sx={{ height, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'grey.50' }}>
        <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} maxZoom={1.5}>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Box>
    </Box>
  );
}

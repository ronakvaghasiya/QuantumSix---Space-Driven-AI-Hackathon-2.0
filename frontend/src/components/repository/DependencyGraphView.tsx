'use client';

import { Box, Typography, Stack, Chip } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface DependencyGraphProps {
  edges: { source: string; target: string; relationType?: string }[];
  adjacencyList?: Record<string, string[]>;
  rootFiles?: string[];
}

export function DependencyGraphView({ edges, rootFiles }: DependencyGraphProps) {
  if (!edges.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No dependency relationships found.
      </Typography>
    );
  }

  const roots = rootFiles?.length
    ? rootFiles
    : Array.from(new Set(edges.map((e) => e.source))).filter(
        (s) => !edges.some((e) => e.target === s),
      ).slice(0, 5);

  const childrenMap = new Map<string, typeof edges>();
  for (const edge of edges) {
    if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
    childrenMap.get(edge.source)!.push(edge);
  }

  const renderChain = (file: string, depth = 0, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(file) || depth > 6) return null;
    visited.add(file);

    const children = childrenMap.get(file) || [];

    return (
      <Box key={`${file}-${depth}`} sx={{ ml: depth * 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
          {depth > 0 && <ArrowDownwardIcon fontSize="small" color="disabled" />}
          <Typography variant="body2" fontFamily="monospace" fontWeight={depth === 0 ? 700 : 400}>
            {file}
          </Typography>
          {depth === 0 && <Chip label="root" size="small" color="primary" variant="outlined" />}
        </Stack>
        {children.map((edge) => renderChain(edge.target, depth + 1, new Set(visited)))}
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2, maxHeight: 400, overflow: 'auto' }}>
      {roots.map((root) => renderChain(root))}
    </Box>
  );
}

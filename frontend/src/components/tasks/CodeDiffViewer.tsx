'use client';

import { useMemo, useRef, useState } from 'react';
import { diffLines } from 'diff';
import {
  Box,
  Chip,
  Stack,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { CodeDiffEntry } from '@/lib/api';

type LineKind = 'unchanged' | 'removed' | 'added' | 'empty';

interface DiffRow {
  left: { text: string; kind: LineKind; lineNo: number | null };
  right: { text: string; kind: LineKind; lineNo: number | null };
}

interface FileDiff {
  path: string;
  original: string;
  modified: string;
  changeComments: string[];
}

function buildSideBySideRows(original: string, modified: string): DiffRow[] {
  const parts = diffLines(original, modified);
  const rows: DiffRow[] = [];
  let leftNo = 1;
  let rightNo = 1;

  for (const part of parts) {
    const lines = part.value.endsWith('\n')
      ? part.value.slice(0, -1).split('\n')
      : part.value.split('\n');
    const chunk = lines.length === 1 && lines[0] === '' ? [] : lines;

    if (part.added) {
      for (const text of chunk) {
        rows.push({
          left: { text: '', kind: 'empty', lineNo: null },
          right: { text, kind: 'added', lineNo: rightNo++ },
        });
      }
    } else if (part.removed) {
      for (const text of chunk) {
        rows.push({
          left: { text, kind: 'removed', lineNo: leftNo++ },
          right: { text: '', kind: 'empty', lineNo: null },
        });
      }
    } else {
      for (const text of chunk) {
        rows.push({
          left: { text, kind: 'unchanged', lineNo: leftNo++ },
          right: { text, kind: 'unchanged', lineNo: rightNo++ },
        });
      }
    }
  }

  return rows;
}

function parseUnifiedDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  const blocks = diff.split(/^diff --git /m).filter(Boolean);

  for (const block of blocks) {
    const pathMatch = block.match(/a\/(.+?) b\//);
    if (!pathMatch) continue;
    const path = pathMatch[1];
    const body = block.split('\n').slice(1);
    const original: string[] = [];
    const modified: string[] = [];

    for (const line of body) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) continue;
      if (line.startsWith('-')) original.push(line.slice(1));
      else if (line.startsWith('+')) modified.push(line.slice(1));
      else if (line.startsWith(' ')) {
        original.push(line.slice(1));
        modified.push(line.slice(1));
      }
    }

    files.push({
      path,
      original: original.join('\n'),
      modified: modified.join('\n'),
      changeComments: [],
    });
  }

  return files;
}

function resolveFileDiffs(codeDiff: CodeDiffEntry): FileDiff[] {
  if (codeDiff.fileEdits?.length) {
    return codeDiff.fileEdits.map((edit) => ({
      path: edit.path,
      original: edit.originalContent ?? '',
      modified: edit.newContent,
      changeComments: edit.changeComments || [],
    }));
  }

  if (codeDiff.diff?.trim()) {
    const parsed = parseUnifiedDiff(codeDiff.diff);
    if (parsed.length) return parsed;
  }

  return (codeDiff.filesToModify || []).map((f) => ({
    path: f.path,
    original: '',
    modified: f.changes.join('\n'),
    changeComments: f.changes,
  }));
}

const lineBg: Record<LineKind, string> = {
  unchanged: 'transparent',
  removed: 'rgba(255, 80, 80, 0.18)',
  added: 'rgba(80, 200, 120, 0.18)',
  empty: 'rgba(128, 128, 128, 0.06)',
};

function DiffPane({
  title,
  rows,
  side,
}: {
  title: string;
  rows: DiffRow[];
  side: 'left' | 'right';
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          bgcolor: 'grey.800',
          color: 'grey.100',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderBottom: 1,
          borderColor: 'grey.700',
        }}
      >
        {title}
      </Box>
      <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8rem' }}>
        {rows.map((row, i) => {
          const cell = side === 'left' ? row.left : row.right;
          return (
            <Box
              key={i}
              sx={{
                display: 'flex',
                bgcolor: lineBg[cell.kind],
                borderBottom: '1px solid',
                borderColor: 'grey.900',
                minHeight: 22,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  flexShrink: 0,
                  px: 1,
                  color: 'grey.500',
                  textAlign: 'right',
                  userSelect: 'none',
                  borderRight: 1,
                  borderColor: 'grey.800',
                }}
              >
                {cell.lineNo ?? ''}
              </Box>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  px: 1,
                  flex: 1,
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                  color: cell.kind === 'empty' ? 'grey.600' : 'grey.100',
                }}
              >
                {cell.text || (cell.kind === 'empty' ? ' ' : '')}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function FileDiffView({ file }: { file: FileDiff }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () => buildSideBySideRows(file.original, file.modified),
    [file.original, file.modified],
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const row of rows) {
      if (row.right.kind === 'added') added++;
      if (row.left.kind === 'removed') removed++;
    }
    return { added, removed };
  }, [rows]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontFamily="monospace">
          {file.path}
        </Typography>
        {stats.removed > 0 && (
          <Chip label={`-${stats.removed}`} size="small" color="error" variant="outlined" />
        )}
        {stats.added > 0 && (
          <Chip label={`+${stats.added}`} size="small" color="success" variant="outlined" />
        )}
      </Stack>

      {file.changeComments.length > 0 && (
        <Box sx={{ mb: 1.5, pl: 1, borderLeft: 3, borderColor: 'info.main' }}>
          {file.changeComments.map((c, i) => (
            <Typography key={i} variant="caption" color="text.secondary" display="block">
              • {c}
            </Typography>
          ))}
        </Box>
      )}

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 480,
          bgcolor: 'grey.900',
          border: 1,
          borderColor: 'grey.800',
        }}
      >
        <DiffPane title="Original" rows={rows} side="left" />
        <Box sx={{ width: 2, bgcolor: 'grey.700', flexShrink: 0 }} />
        <DiffPane title="Modified" rows={rows} side="right" />
      </Box>
    </Box>
  );
}

interface CodeDiffViewerProps {
  codeDiff: CodeDiffEntry;
}

export function CodeDiffViewer({ codeDiff }: CodeDiffViewerProps) {
  const files = useMemo(() => resolveFileDiffs(codeDiff), [codeDiff]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<'split' | 'unified'>('split');

  if (!files.length) {
    return (
      <Typography color="text.secondary" variant="body2">
        No file changes to display.
      </Typography>
    );
  }

  const safeIndex = Math.min(activeIndex, files.length - 1);
  const active = files[safeIndex];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {files.map((f, i) => (
            <Chip
              key={f.path}
              label={f.path.split('/').pop() || f.path}
              size="small"
              variant={i === safeIndex ? 'filled' : 'outlined'}
              color={i === safeIndex ? 'primary' : 'default'}
              onClick={() => setActiveIndex(i)}
              sx={{ fontFamily: 'monospace', maxWidth: 200 }}
              title={f.path}
            />
          ))}
        </Stack>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="split">Side by Side</ToggleButton>
          <ToggleButton value="unified">Unified</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {view === 'split' ? (
        <FileDiffView file={active} />
      ) : (
        codeDiff.diff ? (
          <Box
            component="pre"
            sx={{
              bgcolor: 'grey.900',
              color: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 480,
              fontSize: '0.8rem',
              fontFamily: 'monospace',
            }}
          >
            {codeDiff.diff}
          </Box>
        ) : (
          <FileDiffView file={active} />
        )
      )}

      {files.length > 1 && view === 'split' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {safeIndex + 1} / {files.length} files — click a chip above to switch
        </Typography>
      )}
    </Box>
  );
}

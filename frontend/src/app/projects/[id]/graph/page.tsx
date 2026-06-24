'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Skeleton, Card, CardContent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { PageHeader } from '@/components/common/KpiCard';
import { KnowledgeGraphFlow } from '@/components/repository/KnowledgeGraphFlow';
import { api, KnowledgeGraphResult } from '@/lib/api';

export default function KnowledgeGraphPage() {
  const { id } = useParams<{ id: string }>();
  const [graph, setGraph] = useState<KnowledgeGraphResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.knowledgeGraph.get(id)
      .then(setGraph)
      .catch(() => setGraph(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <PageHeader
        title="Knowledge Graph"
        subtitle="Files, tasks, and test relationships"
        action={
          <Button component={Link} href={`/projects/${id}`} startIcon={<ArrowBackIcon />}>
            Back to Project
          </Button>
        }
      />
      <Card>
        <CardContent>
          {loading ? (
            <Skeleton variant="rectangular" height={520} sx={{ borderRadius: 2 }} />
          ) : (
            <KnowledgeGraphFlow data={graph} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

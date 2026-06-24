'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  Chip,
  Skeleton,
  MenuItem,
  Box,
} from '@mui/material';
import Link from 'next/link';
import StorageIcon from '@mui/icons-material/Storage';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import KeyIcon from '@mui/icons-material/Key';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import LoginIcon from '@mui/icons-material/Login';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExtensionIcon from '@mui/icons-material/Extension';
import { PageHeader } from '@/components/common/KpiCard';
import { api, EmbeddingStatus, GitLabStatus } from '@/lib/api';

const HF_MODELS = [
  'sentence-transformers/all-MiniLM-L6-v2',
  'sentence-transformers/all-mpnet-base-v2',
  'BAAI/bge-small-en-v1.5',
  'BAAI/bge-base-en-v1.5',
];

const QUICK_LINKS = [
  { label: 'Notifications', href: '/settings/notifications', icon: <NotificationsIcon />, desc: 'Email, Slack, Teams alerts' },
  { label: 'Security', href: '/settings/security', icon: <SecurityIcon />, desc: 'Sessions, IP rules, audit export' },
  { label: 'Vault', href: '/settings/vault', icon: <VpnKeyIcon />, desc: 'Encrypted org secrets' },
  { label: 'SSO', href: '/settings/sso', icon: <LoginIcon />, desc: 'Google, Microsoft, OIDC' },
  { label: 'Workflow', href: '/settings/workflow', icon: <AccountTreeIcon />, desc: 'Pipeline approval gates' },
  { label: 'Plugins', href: '/settings/plugins', icon: <ExtensionIcon />, desc: 'Install validation hooks' },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [embedSaved, setEmbedSaved] = useState(false);
  const [error, setError] = useState('');
  const [embedError, setEmbedError] = useState('');
  const [gitlabStatus, setGitlabStatus] = useState<GitLabStatus | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus | null>(null);
  const [gitlabToken, setGitlabToken] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [hfKey, setHfKey] = useState('');
  const [hfModel, setHfModel] = useState(HF_MODELS[0]);
  const [provider, setProvider] = useState<'openai' | 'huggingface'>('huggingface');
  const [baseUrl, setBaseUrl] = useState('https://gitlab.com');
  const [saving, setSaving] = useState(false);
  const [savingEmbed, setSavingEmbed] = useState(false);

  const loadStatus = () => {
    api.gitlab.status().then((s) => {
      setGitlabStatus(s);
      if (s.baseUrl) setBaseUrl(s.baseUrl);
    }).catch(() => setGitlabStatus(null));

    api.settings.embeddingStatus()
      .then((s) => {
        setEmbeddingStatus(s);
        setProvider(s.provider);
        setHfModel(s.huggingface.model || HF_MODELS[0]);
      })
      .catch(() => setEmbeddingStatus(null));
  };

  useEffect(() => { loadStatus(); }, []);

  useEffect(() => {
    if (searchParams.get('gitlab') === 'connected') {
      setSaved(true);
      loadStatus();
      setTimeout(() => setSaved(false), 3000);
    }
  }, [searchParams]);

  const handleSavePat = async () => {
    if (!gitlabToken.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.gitlab.savePat(gitlabToken, baseUrl);
      setGitlabToken('');
      loadStatus();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHf = async () => {
    if (!hfKey.trim()) return;
    setSavingEmbed(true);
    setEmbedError('');
    try {
      await api.settings.saveHuggingFaceKey(hfKey, hfModel);
      setHfKey('');
      loadStatus();
      setEmbedSaved(true);
      setTimeout(() => setEmbedSaved(false), 3000);
    } catch (e) {
      setEmbedError((e as Error).message);
    } finally {
      setSavingEmbed(false);
    }
  };

  const handleSaveOpenAi = async () => {
    if (!openAiKey.trim()) return;
    setSavingEmbed(true);
    setEmbedError('');
    try {
      await api.settings.saveOpenAiKey(openAiKey);
      setOpenAiKey('');
      loadStatus();
      setEmbedSaved(true);
      setTimeout(() => setEmbedSaved(false), 3000);
    } catch (e) {
      setEmbedError((e as Error).message);
    } finally {
      setSavingEmbed(false);
    }
  };

  const handleProviderChange = async (next: 'openai' | 'huggingface') => {
    setProvider(next);
    setSavingEmbed(true);
    setEmbedError('');
    try {
      await api.settings.setEmbeddingProvider(next);
      loadStatus();
    } catch (e) {
      setEmbedError((e as Error).message);
      loadStatus();
    } finally {
      setSavingEmbed(false);
    }
  };

  const handleDisconnect = async () => {
    await api.gitlab.disconnect();
    loadStatus();
  };

  return (
    <>
      {saved && <Alert severity="success" sx={{ mb: 2 }}>GitLab connected successfully.</Alert>}
      {embedSaved && <Alert severity="success" sx={{ mb: 2 }}>Embedding settings saved. Reindex failed projects to retry.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {embedError && <Alert severity="error" sx={{ mb: 2 }}>{embedError}</Alert>}

      <Typography variant="overline" sx={{ mb: 1.5, display: 'block' }}>
        Platform settings
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {QUICK_LINKS.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.href}>
            <Card
              component={Link}
              href={item.href}
              sx={{
                height: '100%',
                textDecoration: 'none',
                transition: 'transform 0.15s, box-shadow 0.15s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 24px rgba(145,158,171,0.16)',
                },
              }}
            >
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ color: 'primary.main', mt: 0.25 }}>{item.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="overline" sx={{ mb: 1.5, display: 'block' }}>
        Integrations
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <StorageIcon color="warning" />
                <Typography variant="h6">GitLab Integration</Typography>
                {gitlabStatus?.connected && (
                  <Chip label={`@${gitlabStatus.username}`} size="small" color="success" />
                )}
              </Stack>

              {gitlabStatus?.connected ? (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Connected via {gitlabStatus.authType?.toUpperCase()} as <strong>{gitlabStatus.username}</strong>
                  </Typography>
                  <Button variant="outlined" color="error" startIcon={<LinkOffIcon />} onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="GitLab Base URL"
                    fullWidth
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://gitlab.com"
                  />
                  <TextField
                    label="Personal Access Token"
                    type="password"
                    fullWidth
                    value={gitlabToken}
                    onChange={(e) => setGitlabToken(e.target.value)}
                    placeholder="glpat-..."
                  />
                  <Button variant="contained" onClick={handleSavePat} disabled={saving || !gitlabToken}>
                    Connect with Token
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <KeyIcon color="primary" />
                <Typography variant="h6">AI Provider</Typography>
                {embeddingStatus && (
                  <Chip label={embeddingStatus.provider} size="small" color="primary" />
                )}
              </Stack>

              <Stack spacing={2}>
                <TextField
                  select
                  label="Provider"
                  fullWidth
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'huggingface')}
                  disabled={savingEmbed}
                >
                  <MenuItem value="huggingface">Hugging Face (hf_ token)</MenuItem>
                  <MenuItem value="openai">OpenAI (sk- key)</MenuItem>
                </TextField>

                {embeddingStatus && (
                  <Typography variant="caption" color="text.secondary">
                    Embeddings: {embeddingStatus.model} · {embeddingStatus.dimensions}d
                    {embeddingStatus.huggingface.chatModel && provider === 'huggingface' && (
                      <> · Agents: {embeddingStatus.huggingface.chatModel}</>
                    )}
                    {provider === 'openai' && <> · Agents: gpt-4o-mini</>}
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" display="block">
                  One token powers indexing + task pipeline. HF only needs hf_ — OpenAI only needs sk-.
                </Typography>

                <Divider />

                {provider === 'huggingface' ? (
                  <>
                    {embeddingStatus?.huggingface.configured && (
                      <Typography variant="body2" color="text.secondary">
                        Token: <strong>{embeddingStatus.huggingface.keyPreview}</strong>
                      </Typography>
                    )}
                    <TextField
                      label="Hugging Face Token"
                      type="password"
                      fullWidth
                      value={hfKey}
                      onChange={(e) => setHfKey(e.target.value)}
                      placeholder="hf_..."
                      helperText="huggingface.co/settings/tokens — needs Inference API access"
                    />
                    <TextField
                      select
                      label="Embedding Model"
                      fullWidth
                      value={hfModel}
                      onChange={(e) => setHfModel(e.target.value)}
                    >
                      {HF_MODELS.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </TextField>
                    <Button variant="contained" onClick={handleSaveHf} disabled={savingEmbed || !hfKey}>
                      Save Hugging Face Token
                    </Button>
                  </>
                ) : (
                  <>
                    {embeddingStatus?.openai.configured && (
                      <Typography variant="body2" color="text.secondary">
                        Key: <strong>{embeddingStatus.openai.keyPreview}</strong>
                      </Typography>
                    )}
                    <TextField
                      label="OpenAI API Key"
                      type="password"
                      fullWidth
                      value={openAiKey}
                      onChange={(e) => setOpenAiKey(e.target.value)}
                      placeholder="sk-..."
                      helperText="platform.openai.com/api-keys"
                    />
                    <Button variant="contained" onClick={handleSaveOpenAi} disabled={savingEmbed || !openAiKey}>
                      Save OpenAI Key
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure GitLab and AI provider (embeddings + agents)" />
      <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

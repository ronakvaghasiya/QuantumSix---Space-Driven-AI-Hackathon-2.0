'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';

const REJECT_REASONS = [
  { value: 'incorrect_analysis', label: 'Incorrect analysis / impact' },
  { value: 'missing_test_coverage', label: 'Missing test coverage' },
  { value: 'code_quality', label: 'Code quality issues' },
  { value: 'security_concern', label: 'Security concern' },
  { value: 'requirements_not_met', label: 'Does not meet requirements' },
  { value: 'other', label: 'Other' },
];

interface RejectModalProps {
  open: boolean;
  title: string;
  action: 'reject' | 'request_changes';
  onClose: () => void;
  onConfirm: (reason: string, comments: string) => void;
}

export function RejectModal({ open, title, action, onClose, onConfirm }: RejectModalProps) {
  const [reason, setReason] = useState('requirements_not_met');
  const [comments, setComments] = useState('');

  const handleConfirm = () => {
    onConfirm(reason, comments);
    setComments('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
          >
            {REJECT_REASONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            multiline
            minRows={3}
            placeholder="Explain what should change..."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={action === 'reject' ? 'error' : 'warning'}
          onClick={handleConfirm}
        >
          {action === 'reject' ? 'Reject' : 'Request Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

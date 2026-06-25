'use client';

import { Alert, Button, Stack } from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';

interface ApprovalActionsBarProps {
  type: 'analysis' | 'code';
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}

export function ApprovalActionsBar({
  type,
  onApprove,
  onReject,
  onRequestChanges,
}: ApprovalActionsBarProps) {
  const isAnalysis = type === 'analysis';

  return (
    <Alert
      severity="warning"
      sx={{ mt: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
    >
      <Stack spacing={1.5}>
        <span>
          {isAnalysis
            ? 'Step 5: Your Approval — review analysis and tests below, then decide.'
            : 'Step 5: Your Approval — review code changes on the Code Diff tab, then decide.'}
        </span>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<ThumbUpIcon />}
            onClick={onApprove}
          >
            {isAnalysis ? 'Approve Tests & Analysis' : 'Approve Code'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<ThumbDownIcon />}
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={onRequestChanges}
          >
            Request Changes
          </Button>
        </Stack>
      </Stack>
    </Alert>
  );
}

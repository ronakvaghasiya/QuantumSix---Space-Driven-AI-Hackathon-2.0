'use client';

import React from 'react';
import { TextField, InputAdornment, IconButton, useTheme, alpha } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  fullWidth = true,
}: SearchInputProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      fullWidth={fullWidth}
      variant="outlined"
      size="small"
      autoComplete="off"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon
              sx={{
                color: 'text.secondary',
                transition: 'color 0.2s ease',
                fontSize: 20,
              }}
            />
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={() => onChange('')}
              edge="end"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <ClearIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2.5,
          bgcolor: isDark ? 'rgba(22, 28, 36, 0.3)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(145, 158, 171, 0.16)' : 'rgba(145, 158, 171, 0.24)',
          '&:hover': {
            borderColor: 'primary.light',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, isDark ? 0.12 : 0.06)}`,
            '& .MuiSvgIcon-root': {
              color: 'primary.main',
            },
          },
          '&.Mui-focused': {
            borderColor: 'primary.main',
            boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, isDark ? 0.24 : 0.12)}`,
            '& .MuiSvgIcon-root': {
              color: 'primary.main',
            },
          },
        },
        '& .MuiOutlinedInput-notchedOutline': {
          border: 'none', // Remove the default outline border since we style the root
        },
        '& .MuiInputBase-input': {
          py: 1.25,
          fontSize: '0.875rem',
          color: 'text.primary',
          '&::placeholder': {
            color: 'text.secondary',
            opacity: 0.65,
          },
        },
      }}
    />
  );
}

import { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';

const ToggleContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  [theme.breakpoints.down('sm')]: {
    bottom: 16,
    right: 16,
  },
}));

const ToggleButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})<{ isActive?: boolean }>(({ theme, isActive }) => ({
  width: 56,
  height: 56,
  backgroundColor: isActive ? '#ffbb00' : 'rgba(20, 20, 20, 0.9)',
  color: isActive ? '#141414' : '#ffffff',
  border: `2px solid ${isActive ? '#ffbb00' : 'rgba(255, 255, 255, 0.1)'}`,
  backdropFilter: 'blur(10px)',
  boxShadow: isActive 
    ? '0 8px 24px rgba(255, 187, 0, 0.4)' 
    : '0 4px 12px rgba(0, 0, 0, 0.3)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    backgroundColor: isActive ? '#ffbb00' : 'rgba(255, 187, 0, 0.2)',
    transform: 'scale(1.1)',
    boxShadow: '0 12px 32px rgba(255, 187, 0, 0.5)',
  },
}));

const DESIGN_MODE_KEY = 'homepage.designMode';

export type DesignMode = 'classic' | 'modern';

export function HomePageDesignToggle({ 
  onModeChange 
}: { 
  onModeChange: (mode: DesignMode) => void 
}) {
  const [mode, setMode] = useState<DesignMode>(() => {
    const saved = localStorage.getItem(DESIGN_MODE_KEY);
    return (saved === 'modern' || saved === 'classic') ? saved : 'classic';
  });

  useEffect(() => {
    onModeChange(mode);
  }, [mode, onModeChange]);

  const toggleMode = () => {
    const newMode: DesignMode = mode === 'classic' ? 'modern' : 'classic';
    setMode(newMode);
    localStorage.setItem(DESIGN_MODE_KEY, newMode);
  };

  return (
    <ToggleContainer>
      <Tooltip title={mode === 'classic' ? 'Переключить на современный дизайн' : 'Вернуться к классическому дизайну'} arrow>
        <ToggleButton 
          onClick={toggleMode}
          isActive={mode === 'modern'}
          aria-label="Переключить дизайн"
        >
          {mode === 'classic' ? <AutoAwesomeIcon /> : <HistoryIcon />}
        </ToggleButton>
      </Tooltip>
    </ToggleContainer>
  );
}


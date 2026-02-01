// Панель для мультипользовательского режима

import { useState } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, IconButton, Chip } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer' | 'contributor';
  name?: string;
}

interface TeamPanelProps {
  pageId: string;
  members?: TeamMember[];
  onAddMember?: (email: string, role: TeamMember['role']) => void;
  onRemoveMember?: (id: string) => void;
  onUpdateRole?: (id: string, role: TeamMember['role']) => void;
}

export function TeamPanel({ pageId, members = [], onAddMember, onRemoveMember, onUpdateRole }: TeamPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMember['role']>('viewer');

  const roleLabels = {
    admin: 'Администратор',
    editor: 'Редактор',
    viewer: 'Просмотр',
    contributor: 'Участник',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Команда</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Добавить участника
        </Button>
      </Box>

      <List>
        {members.map((member) => (
          <ListItem
            key={member.id}
            secondaryAction={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={roleLabels[member.role]}
                  size="small"
                  color={member.role === 'admin' ? 'primary' : 'default'}
                />
                {onRemoveMember && (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onRemoveMember(member.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            }
          >
            <ListItemText
              primary={member.name || member.email}
              secondary={member.email}
            />
          </ListItem>
        ))}
        {members.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Нет участников команды
          </Typography>
        )}
      </List>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Добавить участника</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <TextField
              label="Роль"
              select
              fullWidth
              SelectProps={{
                native: true,
              }}
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as TeamMember['role'])}
            >
              <option value="viewer">Просмотр</option>
              <option value="contributor">Участник</option>
              <option value="editor">Редактор</option>
              <option value="admin">Администратор</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (onAddMember && newMemberEmail) {
                onAddMember(newMemberEmail, newMemberRole);
                setNewMemberEmail('');
                setDialogOpen(false);
              }
            }}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

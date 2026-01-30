import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Chip, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Switch, FormControlLabel, Grid,
  Avatar, Stack
} from '@mui/material';
import { Add, Edit, Delete, Visibility, VisibilityOff } from '@mui/icons-material';
import { listTeamMembers, deleteTeamMember, updateTeamMember } from '@/services/cmsApi';
import { TeamMember } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl, fallbackImageUrl } from '@/utils/resolveImageUrl';

export default function TeamListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => listTeamMembers(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      showToast('Сотрудник удален', 'success');
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      showToast(error?.message || 'Ошибка при удалении', 'error');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateTeamMember(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      showToast('Статус обновлен', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Ошибка при обновлении', 'error');
    },
  });

  const handleDelete = (member: TeamMember) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (memberToDelete) {
      deleteMutation.mutate(memberToDelete.id);
    }
  };

  const handleToggleActive = (member: TeamMember) => {
    toggleActiveMutation.mutate({ id: member.id, isActive: !member.isActive });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Команда</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/admin/team/new')}
        >
          Добавить сотрудника
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Фото</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Должность</TableCell>
              <TableCell>Навыки</TableCell>
              <TableCell>Активен</TableCell>
              <TableCell>Порядок</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Нет сотрудников. Добавьте первого!</Typography>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id} hover>
                  <TableCell>
                    <Avatar
                      src={member.imageUrl ? resolveImageUrl(member.imageUrl) : undefined}
                      sx={{ width: 48, height: 48 }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight={600}>
                      {member.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {member.role}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {member.skills && member.skills.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {member.skills.slice(0, 3).map((skill, idx) => (
                          <Chip key={idx} label={skill} size="small" />
                        ))}
                        {member.skills.length > 3 && (
                          <Chip label={`+${member.skills.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={member.isActive}
                          onChange={() => handleToggleActive(member)}
                          size="small"
                        />
                      }
                      label={member.isActive ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{member.sortOrder}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/team/${member.id}`)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(member)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить сотрудника?</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить сотрудника <strong>{memberToDelete?.name}</strong>?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


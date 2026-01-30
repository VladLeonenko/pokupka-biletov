import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listChats, Chat } from '@/services/chatApi';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MessageIcon from '@mui/icons-material/Message';
import { formatDate } from '@/utils/date';

export function ChatsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['chats', page, limit, status, search],
    queryFn: () => listChats({ page, limit, status: status || undefined, search: search || undefined }),
    refetchInterval: 5000, // Обновляем каждые 5 секунд для получения новых сообщений
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'closed': return 'default';
      case 'archived': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Чаты</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Поиск"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            size="small"
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={status}
              label="Статус"
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="closed">Закрытые</MenuItem>
              <MenuItem value="archived">Архив</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Клиент</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Непрочитано</TableCell>
              <TableCell>Последнее сообщение</TableCell>
              <TableCell>Назначен</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Загрузка...</TableCell>
              </TableRow>
            ) : data?.chats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Чаты не найдены</TableCell>
              </TableRow>
            ) : (
              data?.chats.map((chat) => (
                <TableRow key={chat.id} hover>
                  <TableCell>{chat.client_name || '-'}</TableCell>
                  <TableCell>{chat.client_email || '-'}</TableCell>
                  <TableCell>{chat.client_phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={chat.status}
                      color={getStatusColor(chat.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {chat.unread_count ? (
                      <Chip label={chat.unread_count} color="error" size="small" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {chat.last_message ? (
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {chat.last_message}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{chat.assigned_to_name || '-'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Открыть чат">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin/chat/${chat.id}`)}
                      >
                        <MessageIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && (
          <TablePagination
            component="div"
            count={data.pagination.total}
            page={data.pagination.page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            rowsPerPage={data.pagination.limit}
            onRowsPerPageChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </TableContainer>
    </Box>
  );
}


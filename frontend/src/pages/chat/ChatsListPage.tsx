import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '@/utils/date';

const STATUS_LABEL: Record<string, string> = {
  active: 'открыт',
  closed: 'закрыт',
  archived: 'архив',
};

function pageLabel(chat: Chat) {
  if (chat.page_title) return chat.page_title;
  if (!chat.page_url) return '';
  try {
    const path = chat.page_url.startsWith('http') ? new URL(chat.page_url).pathname : chat.page_url;
    return path;
  } catch {
    return chat.page_url;
  }
}

export function ChatsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [includeEmpty, setIncludeEmpty] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chats', page, limit, status, search, includeEmpty],
    queryFn: () => listChats({
      page,
      limit,
      status: status || undefined,
      search: search || undefined,
      includeEmpty,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 8000,
  });

  const openChat = (id: number) => {
    void import('@/pages/chat/ChatViewPage');
    navigate(`/admin/chat/${id}`);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Чаты</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Имя, почта, телефон или текст"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            size="small"
            sx={{ flex: 1, minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
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
              <MenuItem value="active">Открытые</MenuItem>
              <MenuItem value="closed">Закрытые</MenuItem>
              <MenuItem value="archived">Архив</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={(
              <Switch
                checked={includeEmpty}
                onChange={(e) => {
                  setIncludeEmpty(e.target.checked);
                  setPage(1);
                }}
              />
            )}
            label="Пустые"
          />
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Клиент</TableCell>
              <TableCell>Контакты</TableCell>
              <TableCell>Страница</TableCell>
              <TableCell>Последнее</TableCell>
              <TableCell>Заказы</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Загрузка...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Не удалось загрузить чаты</TableCell>
              </TableRow>
            ) : data?.chats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {includeEmpty ? 'Чатов нет' : 'Нет диалогов с сообщениями. Пустые открытия виджета скрыты.'}
                </TableCell>
              </TableRow>
            ) : (
              data?.chats.map((chat) => {
                const unread = Number(chat.unread_count) || 0;
                const orders = Number(chat.orders_count) || 0;
                const where = pageLabel(chat);
                return (
                  <TableRow
                    key={chat.id}
                    hover
                    onMouseEnter={() => { void import('@/pages/chat/ChatViewPage'); }}
                    onClick={() => openChat(chat.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={unread ? 700 : 400}>
                          {chat.client_name || 'Гость'}
                        </Typography>
                        {unread > 0 && <Chip label={unread} color="error" size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{chat.client_email || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{chat.client_phone || ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 220 }} title={chat.page_url || ''}>
                        {where || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                        {chat.last_message || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {chat.last_message_time ? formatDateTime(chat.last_message_time) : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{orders > 0 ? orders : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[chat.status] || chat.status}
                        color={chat.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
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
            labelRowsPerPage="На странице"
          />
        )}
      </TableContainer>
    </Box>
  );
}

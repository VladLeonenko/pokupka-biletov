import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  createGetbiletGroup,
  deleteMarkupEvent,
  deleteMarkupGroup,
  getMarkup,
  listGetbiletEvents,
  listGetbiletGroups,
  putMarkupEvent,
  putMarkupGlobal,
  putMarkupGroup,
} from '@/services/getbiletAdminApi';
import { useToast } from '@/components/common/ToastProvider';
import { useState } from 'react';

function KindValueForm({
  initialKind,
  initialValue,
  onSave,
  saving,
  onDelete,
  deleteLabel,
}: {
  initialKind: 'percent' | 'fixed';
  initialValue: number;
  onSave: (k: 'percent' | 'fixed', v: number) => void;
  saving: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  const [kind, setKind] = useState<'percent' | 'fixed'>(initialKind);
  const [val, setVal] = useState(String(initialValue));
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel>Тип</InputLabel>
        <Select value={kind} label="Тип" onChange={(e) => setKind(e.target.value as 'percent' | 'fixed')}>
          <MenuItem value="percent">Процент</MenuItem>
          <MenuItem value="fixed">Фикс (₽)</MenuItem>
        </Select>
      </FormControl>
      <TextField
        size="small"
        type="number"
        label="Значение"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        sx={{ width: 120 }}
        inputProps={{ step: '0.01', min: 0 }}
      />
      <Button size="small" variant="contained" disabled={saving} onClick={() => onSave(kind, Number(val))}>
        Сохранить
      </Button>
      {onDelete && (
        <Button size="small" color="warning" onClick={onDelete}>
          {deleteLabel || 'Сбросить'}
        </Button>
      )}
    </Box>
  );
}

export function GetbiletMarkupPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['getbilet-markup'],
    queryFn: getMarkup,
  });
  const { data: groups = [] } = useQuery({ queryKey: ['getbilet-groups'], queryFn: listGetbiletGroups });
  const { data: events = [] } = useQuery({ queryKey: ['getbilet-events'], queryFn: listGetbiletEvents });

  const [newGroupName, setNewGroupName] = useState('');
  const [addEventId, setAddEventId] = useState<number | ''>('');

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['getbilet-markup'] });
  };

  const saveGlobal = useMutation({
    mutationFn: (b: { markup_kind: 'percent' | 'fixed'; markup_value: number }) => putMarkupGlobal(b),
    onSuccess: () => {
      inv();
      showToast('Глобальная наценка сохранена', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const saveGroup = useMutation({
    mutationFn: ({ id, ...b }: { id: number; markup_kind: 'percent' | 'fixed'; markup_value: number }) =>
      putMarkupGroup(id, b),
    onSuccess: () => {
      inv();
      showToast('Сохранено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const delGroupRule = useMutation({
    mutationFn: deleteMarkupGroup,
    onSuccess: () => {
      inv();
      showToast('Правило группы удалено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const saveEvent = useMutation({
    mutationFn: ({
      eventId,
      ...b
    }: {
      eventId: number;
      markup_kind: 'percent' | 'fixed';
      markup_value: number;
    }) => putMarkupEvent(eventId, b),
    onSuccess: () => {
      inv();
      showToast('Сохранено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const delEventRule = useMutation({
    mutationFn: deleteMarkupEvent,
    onSuccess: () => {
      inv();
      showToast('Индивидуальная наценка снята', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const createGroup = useMutation({
    mutationFn: () => createGetbiletGroup({ name: newGroupName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['getbilet-groups'] });
      setNewGroupName('');
      showToast('Группа создана', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" onClose={() => refetch()}>
          {(error as Error)?.message || 'Ошибка загрузки'}
        </Alert>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Убедитесь, что миграции GetBilet применены к БД (таблицы getbilet_markup_rules и т.д.) и задано{' '}
          <code>GETBILET_USE_MAIN_DATABASE=1</code> при одной БД с CRM.
        </Typography>
      </Box>
    );
  }

  const markupData = data ?? { global: null, groupRules: [], eventRules: [] };
  const g = markupData.global;
  const globalKind = (g?.markup_kind as 'percent' | 'fixed') || 'percent';
  const globalVal = g ? Number(g.markup_value) : 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Наценка GetBilet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        При расчёте цены применяется одно правило с наивысшим приоритетом:{' '}
        <strong>индивидуально для события</strong> → затем <strong>группа</strong> → затем{' '}
        <strong>глобально для всех билетов</strong>. Процент — от цены поставщика; фикс — надбавка в рублях на
        билет.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          1. Все билеты (глобально)
        </Typography>
        <KindValueForm
          initialKind={globalKind}
          initialValue={globalVal}
          saving={saveGlobal.isPending}
          onSave={(markup_kind, markup_value) => saveGlobal.mutate({ markup_kind, markup_value })}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          2. Группы мероприятий
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Создайте группу, назначьте мероприятия в карточке события, затем задайте наценку для группы.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Новая группа"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Button
            variant="outlined"
            disabled={!newGroupName.trim() || createGroup.isPending}
            onClick={() => createGroup.mutate()}
          >
            Создать группу
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Группа</TableCell>
              <TableCell>Наценка</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography color="text.secondary">Нет групп</Typography>
                </TableCell>
              </TableRow>
            ) : (
              groups.map((gr) => {
                const rule = markupData.groupRules.find((r) => r.group_id === gr.id);
                return (
                  <TableRow key={gr.id}>
                    <TableCell>
                      {gr.name} <Typography component="span" variant="caption" color="text.secondary">
                        ({gr.events_count} событ.)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <KindValueForm
                        initialKind={(rule?.markup_kind as 'percent' | 'fixed') || 'percent'}
                        initialValue={rule ? Number(rule.markup_value) : 0}
                        saving={saveGroup.isPending}
                        onSave={(markup_kind, markup_value) =>
                          saveGroup.mutate({ id: gr.id, markup_kind, markup_value })
                        }
                        onDelete={
                          rule
                            ? () => {
                                if (confirm('Убрать наценку для этой группы?')) delGroupRule.mutate(gr.id);
                              }
                            : undefined
                        }
                        deleteLabel="Убрать правило"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          3. Индивидуально по мероприятию
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Добавить индивидуальное правило:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>Мероприятие</InputLabel>
            <Select
              value={addEventId === '' ? '' : String(addEventId)}
              label="Мероприятие"
              onChange={(e) => {
                const v = e.target.value;
                setAddEventId(v === '' ? '' : Number(v));
              }}
            >
              <MenuItem value="">— выберите —</MenuItem>
              {events.map((ev) => (
                <MenuItem key={ev.id} value={String(ev.id)}>
                  {ev.getbilet_external_id}
                  {ev.title_manual ? ` — ${ev.title_manual}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <KindValueForm
            initialKind="percent"
            initialValue={0}
            saving={saveEvent.isPending}
            onSave={(markup_kind, markup_value) => {
              if (addEventId === '') {
                showToast('Выберите мероприятие', 'error');
                return;
              }
              saveEvent.mutate({ eventId: addEventId as number, markup_kind, markup_value });
            }}
          />
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Мероприятие</TableCell>
              <TableCell>Наценка</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {markupData.eventRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography color="text.secondary">Нет индивидуальных правил</Typography>
                </TableCell>
              </TableRow>
            ) : (
              markupData.eventRules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                      {r.getbilet_external_id}
                    </Typography>
                    {r.title_manual ? (
                      <Typography variant="body2" color="text.secondary">
                        {r.title_manual}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <KindValueForm
                      initialKind={r.markup_kind as 'percent' | 'fixed'}
                      initialValue={Number(r.markup_value)}
                      saving={saveEvent.isPending}
                      onSave={(markup_kind, markup_value) =>
                        saveEvent.mutate({ eventId: r.event_id, markup_kind, markup_value })
                      }
                      onDelete={() => {
                        if (confirm('Снять индивидуальную наценку?')) delEventRule.mutate(r.event_id);
                      }}
                      deleteLabel="Снять"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

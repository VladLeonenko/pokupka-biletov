import { useState, useEffect } from 'react';
import { Box, Typography, Button, FormControl, InputLabel, Select, MenuItem, Slider, Link } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCharityPreferences, putCharityPreferences, type CharityAllocation } from '@/services/charityApi';
import { CHARITY_FUNDS } from '@/config/charityFunds';
import { useToast } from '@/components/common/ToastProvider';

const cardSx = {
  p: 3,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.06)',
  bgcolor: 'rgba(20,20,20,0.6)',
  transition: 'border-color 0.3s, transform 0.3s',
  '&:hover': { borderColor: 'rgba(255,187,0,0.2)', transform: 'translateY(-2px)' },
};

export function CharityPreferencesBlock() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['charityPreferences'],
    queryFn: getCharityPreferences,
  });

  const [mode, setMode] = useState<'none' | 'one' | 'two'>('none');
  const [fund1, setFund1] = useState('');
  const [fund2, setFund2] = useState('');
  const [percent1, setPercent1] = useState(5);
  const [percent2, setPercent2] = useState(5);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const allocs = data?.allocations || [];
    if (allocs.length === 0) {
      setMode('none');
      setFund1('');
      setFund2('');
      setPercent1(5);
      setPercent2(5);
    } else if (allocs.length === 1) {
      setMode('one');
      setFund1(allocs[0].fund_id);
      setFund2('');
      setPercent1(10);
      setPercent2(5);
    } else {
      setMode('two');
      setFund1(allocs[0].fund_id);
      setFund2(allocs[1].fund_id);
      setPercent1(allocs[0].percent);
      setPercent2(allocs[1].percent);
    }
    setDirty(false);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (allocations: CharityAllocation[]) => putCharityPreferences(allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charityPreferences'] });
      showToast('Пожелания сохранены. 10% от заказа пойдут в выбранные фонды.', 'success');
      setDirty(false);
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleSave = () => {
    if (mode === 'none') {
      saveMutation.mutate([]);
      return;
    }
    if (mode === 'one' && fund1) {
      saveMutation.mutate([{ fund_id: fund1, fund_name: CHARITY_FUNDS.find((f) => f.id === fund1)?.name || fund1, percent: 10 }]);
      return;
    }
    if (mode === 'two' && fund1 && fund2 && fund1 !== fund2) {
      const p1 = Math.min(10, Math.max(0, percent1));
      const p2 = 10 - p1;
      saveMutation.mutate([
        { fund_id: fund1, fund_name: CHARITY_FUNDS.find((f) => f.id === fund1)?.name || fund1, percent: p1 },
        { fund_id: fund2, fund_name: CHARITY_FUNDS.find((f) => f.id === fund2)?.name || fund2, percent: p2 },
      ]);
    }
  };

  const canSave =
    dirty &&
    ((mode === 'none') ||
      (mode === 'one' && !!fund1) ||
      (mode === 'two' && !!fund1 && !!fund2 && fund1 !== fund2));

  if (isLoading) return null;

  return (
    <Box sx={{ ...cardSx, mb: 4 }}>
      <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem', mb: 2 }}>
        Благотворительность
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
        10% от каждого заказа направляем в фонды. Выберите один фонд или разделите между двумя.
      </Typography>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Режим</InputLabel>
        <Select
          value={mode}
          label="Режим"
          onChange={(e) => {
            setMode(e.target.value as 'none' | 'one' | 'two');
            setDirty(true);
          }}
          sx={{
            color: '#fff',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,187,0,0.35)' },
          }}
        >
          <MenuItem value="none">Не выбрано</MenuItem>
          <MenuItem value="one">Один фонд (10%)</MenuItem>
          <MenuItem value="two">Два фонда (разделить 10%)</MenuItem>
        </Select>
      </FormControl>

      {mode === 'one' && (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Фонд</InputLabel>
          <Select
            value={fund1}
            label="Фонд"
            onChange={(e) => {
              setFund1(e.target.value);
              setDirty(true);
            }}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.12)' },
            }}
          >
            {CHARITY_FUNDS.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {mode === 'two' && (
        <>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Фонд 1</InputLabel>
            <Select
              value={fund1}
              label="Фонд 1"
              onChange={(e) => {
                setFund1(e.target.value);
                setDirty(true);
              }}
              sx={{ color: '#fff' }}
            >
              {CHARITY_FUNDS.filter((f) => f.id !== fund2).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {percent1}%
            </Typography>
            <Slider
              value={percent1}
              min={0}
              max={10}
              step={1}
              onChange={(_, v) => {
                setPercent1(v as number);
                setPercent2(10 - (v as number));
                setDirty(true);
              }}
              sx={{ color: '#ffbb00' }}
            />
          </Box>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Фонд 2</InputLabel>
            <Select
              value={fund2}
              label="Фонд 2"
              onChange={(e) => {
                setFund2(e.target.value);
                setDirty(true);
              }}
              sx={{ color: '#fff' }}
            >
              {CHARITY_FUNDS.filter((f) => f.id !== fund1).map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name} ({10 - percent1}%)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}

      {canSave && (
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          sx={{
            bgcolor: '#ffbb00',
            color: '#141414',
            fontWeight: 600,
            '&:hover': { bgcolor: '#e5a800', color: '#141414' },
          }}
        >
          {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
      )}

      <Typography component={Link} to="/charity" sx={{ color: '#ffbb00', fontSize: '0.85rem', mt: 1, display: 'inline-block', textDecoration: 'underline' }}>
        Подробнее о благотворительности →
      </Typography>
    </Box>
  );
}

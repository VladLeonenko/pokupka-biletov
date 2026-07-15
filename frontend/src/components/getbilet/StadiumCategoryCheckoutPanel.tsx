import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  isCategoryCheckoutLayout,
  parseLayoutJsonText,
  patchCategoryCheckoutLayout,
  sectorPreviewImagesFromLayout,
  type StadiumCategoryCheckoutLayout,
} from '@/utils/stadiumCategoryCheckoutLayout';
import { refreshPbiletCategoryStageMap } from '@/services/getbiletAdminApi';

type Props = {
  stageMapId: number | null;
  stageExternalId: string;
  layoutJsonText: string;
  onLayoutJsonTextChange: (next: string) => void;
};

export function StadiumCategoryCheckoutPanel({
  stageMapId,
  stageExternalId,
  layoutJsonText,
  onLayoutJsonTextChange,
}: Props) {
  const layout = useMemo(() => parseLayoutJsonText(layoutJsonText), [layoutJsonText]);
  const stageNorm = stageExternalId.trim().toLowerCase();
  const active = isCategoryCheckoutLayout(layout) || layout.pbiletCategoryCheckout === true;
  const sectors = layout.sectorMode?.sectors ?? [];

  const [hideSeatList, setHideSeatList] = useState(Boolean(layout.hideSeatList));
  const [defaultPreview, setDefaultPreview] = useState(
    String(layout.categoryCheckoutDefaults?.previewImageUrl ?? ''),
  );
  const [sectorUrls, setSectorUrls] = useState<Record<string, string>>(() =>
    sectorPreviewImagesFromLayout(layout),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);

  const syncFromLayout = (nextLayout: StadiumCategoryCheckoutLayout) => {
    setHideSeatList(Boolean(nextLayout.hideSeatList));
    setDefaultPreview(String(nextLayout.categoryCheckoutDefaults?.previewImageUrl ?? ''));
    setSectorUrls(sectorPreviewImagesFromLayout(nextLayout));
  };

  useEffect(() => {
    syncFromLayout(parseLayoutJsonText(layoutJsonText));
  }, [layoutJsonText]);

  const applyPatch = () => {
    onLayoutJsonTextChange(
      patchCategoryCheckoutLayout(layoutJsonText, {
        hideSeatList,
        defaultPreviewImageUrl: defaultPreview,
        sectorPreviewImages: sectorUrls,
      }),
    );
  };

  const handleRefreshPrices = async () => {
    if (stageMapId == null) return;
    setRefreshing(true);
    setRefreshMsg(null);
    setRefreshError(false);
    try {
      const data = await refreshPbiletCategoryStageMap(stageMapId);
      if (data.layout_json) {
        const text = JSON.stringify(data.layout_json, null, 2);
        onLayoutJsonTextChange(text);
      }
      setRefreshMsg(
        `Цены Portalbilet: ${data.offerCount ?? 0} офферов, ${data.priceTierCount ?? 0} ценовых уровней (${data.mode ?? 'ok'})`,
      );
    } catch (e) {
      setRefreshError(true);
      setRefreshMsg((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!active) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255, 78, 24, 0.04)' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
        Стадион: категории Portalbilet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Цвета секторов на карте — по ценам из офферов. Фото в модалке — по URL ниже (пусто = постер
        мероприятия).
      </Typography>

      <FormControlLabel
        control={<Checkbox checked={hideSeatList} onChange={(e) => setHideSeatList(e.target.checked)} />}
        label="Скрыть «Список мест» на странице билета"
        sx={{ display: 'block', mb: 1.5 }}
      />

      <TextField
        label="Фото по умолчанию (если у сектора нет своего)"
        value={defaultPreview}
        onChange={(e) => setDefaultPreview(e.target.value)}
        fullWidth
        size="small"
        placeholder="https://… или /hall-maps/…"
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Фото секторов (вид с трибуны)
      </Typography>
      <Box sx={{ overflowX: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Сектор</TableCell>
              <TableCell>Цена от</TableCell>
              <TableCell>URL картинки</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sectors.map((s) => {
              const id = String(s.id);
              return (
                <TableRow key={id}>
                  <TableCell>{s.label}</TableCell>
                  <TableCell>
                    {s.minPrice != null
                      ? `${Number(s.minPrice).toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={sectorUrls[id] ?? ''}
                      onChange={(e) =>
                        setSectorUrls((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      size="small"
                      fullWidth
                      placeholder="https://…"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button variant="contained" onClick={applyPatch}>
          Применить в layout_json
        </Button>
        {stageMapId != null ? (
          <Button variant="outlined" disabled={refreshing} onClick={() => void handleRefreshPrices()}>
            {refreshing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
            Обновить цены из Portalbilet
          </Button>
        ) : null}
      </Box>
      {refreshMsg ? (
        <Alert severity={refreshError ? 'error' : 'success'} sx={{ mt: 2 }}>
          {refreshMsg}
        </Alert>
      ) : null}
    </Paper>
  );
}

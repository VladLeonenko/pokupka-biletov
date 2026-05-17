import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';
import {
  fetchLuzhnikiFootballStadiumPreview,
  fetchLuzhnikiSeatGridDiagnostic,
  fetchStageMap,
} from '@/services/biletPublicApi';
import { parseLayoutSeatPositions } from '@/utils/svgNativeSeatLayout';
import { seatsToGridSeats } from '@/utils/luzhnikiFieldGridCompare';
import {
  analyzeSeatGridQuality,
  buildSeatRowColumnGrid,
  gridLinesToSvgMarkup,
  type GridSeat,
} from '@/utils/luzhnikiSeatRowColumnGrid';
import { LUZHNIKI_FOOTBALL_STAGE_MAP_KEY } from '@/utils/luzhnikiStadiumMap';

const SUPERFINAL_REPERTOIRE = '6a05d17b46a4d000309ecf4e';
const REFERENCE_SECTORS = ['Сектор D 230', 'Сектор A 103', 'Сектор C 131'];

type DataMode = 'strict' | 'fieldGrid' | 'compare';

function layoutSeatsFromUnknown(layout: unknown): GridSeat[] {
  return parseLayoutSeatPositions(layout).map((s) => ({
    sector: s.sector,
    row: s.row,
    seat: s.seat,
    xPct: s.xPct,
    yPct: s.yPct,
  }));
}

function uniqueSectors(seats: GridSeat[]): string[] {
  const m = new Map<string, string>();
  for (const s of seats) {
    const k = s.sector.trim().toLowerCase();
    if (!m.has(k)) m.set(k, s.sector.trim());
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function LuzhnikiSeatGridDiagnosticPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const repertoireId = searchParams.get('repertoireId')?.trim() || SUPERFINAL_REPERTOIRE;
  const source = searchParams.get('source') === 'map' ? 'map' : 'preview';
  const dataMode = (searchParams.get('mode') as DataMode) || 'strict';

  const [sectorDraft, setSectorDraft] = useState(searchParams.get('sector') ?? 'D 230');

  const diagnosticQ = useQuery({
    queryKey: ['luzhniki-grid-diagnostic', sectorDraft],
    queryFn: () => fetchLuzhnikiSeatGridDiagnostic(sectorDraft),
    staleTime: 120_000,
  });

  const previewQ = useQuery({
    queryKey: ['luzhniki-grid-preview'],
    queryFn: () => fetchLuzhnikiFootballStadiumPreview({ demoEventIso: '2026-05-24T15:00:00.000Z' }),
    enabled: source === 'preview',
    staleTime: 60_000,
  });

  const mapQ = useQuery({
    queryKey: ['luzhniki-grid-map', repertoireId],
    queryFn: () => fetchStageMap(LUZHNIKI_FOOTBALL_STAGE_MAP_KEY, repertoireId),
    enabled: source === 'map',
    staleTime: 30_000,
  });

  const active = source === 'map' ? mapQ : previewQ;
  const svgBg = active.data?.svg_markup ?? '';
  const layout = active.data?.layout_json;

  const diag = diagnosticQ.data;
  const hallWidth = diag?.hallWidth ?? 11413;
  const hallHeight = diag?.hallHeight ?? 9676;

  const seatsForGrid = useMemo((): GridSeat[] => {
    if (dataMode === 'strict' && diag?.strict?.length) return seatsToGridSeats(diag.strict);
    if (dataMode === 'fieldGrid' && diag?.fieldGrid?.length) return seatsToGridSeats(diag.fieldGrid);
    if (dataMode === 'compare' && diag) {
      const f = sectorDraft.trim().toLowerCase();
      const match = (sector: string) => {
        const s = sector.toLowerCase();
        return !f || s.includes(f) || f.includes(s.replace(/^сектор\s+/, ''));
      };
      return [
        ...seatsToGridSeats(diag.strict.filter((s) => match(s.sector))).map((s) => ({
          ...s,
          sector: `${s.sector} [strict]`,
        })),
        ...seatsToGridSeats(diag.fieldGrid.filter((s) => match(s.sector))).map((s) => ({
          ...s,
          sector: `${s.sector} [grid]`,
        })),
      ];
    }
    return layoutSeatsFromUnknown(layout);
  }, [dataMode, diag, layout]);

  const sectors = useMemo(
    () => (diag?.sectors?.length ? diag.sectors : uniqueSectors(seatsForGrid)),
    [diag?.sectors, seatsForGrid],
  );

  const { rowLines, columnLines } = useMemo(
    () =>
      buildSeatRowColumnGrid(seatsForGrid, {
        sector: dataMode === 'compare' ? undefined : sectorDraft,
        hallWidth,
        hallHeight,
      }),
    [seatsForGrid, sectorDraft, dataMode, hallWidth, hallHeight],
  );

  const quality = useMemo(() => analyzeSeatGridQuality(rowLines, columnLines), [rowLines, columnLines]);

  const overlaySvg = useMemo(
    () => gridLinesToSvgMarkup(rowLines, columnLines, hallWidth, hallHeight),
    [rowLines, columnLines, hallWidth, hallHeight],
  );

  const seatCountInSector = useMemo(() => {
    if (dataMode === 'strict') return diag?.strict?.length ?? 0;
    if (dataMode === 'fieldGrid') return diag?.fieldGrid?.length ?? 0;
    const f = sectorDraft.trim().toLowerCase();
    return seatsForGrid.filter((s) => s.sector.toLowerCase().includes(f)).length;
  }, [dataMode, diag, seatsForGrid, sectorDraft]);

  const verdictSeverity =
    quality.verdict === 'grid_crooked'
      ? 'error'
      : quality.verdict === 'grid_ok'
        ? 'success'
        : 'warning';

  const setMode = (mode: DataMode) => {
    const next = new URLSearchParams(searchParams);
    next.set('mode', mode);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <SeoMetaTags title="Тест: сетка рядов/мест Лужники" noindex />
      <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Сетка рядов и колонн (диагностика)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          <strong>Красные</strong> — ряд · <strong>синие пунктир</strong> — колонна. Подложка:{' '}
          <code>{source}</code>
          {source === 'map' ? ` · repertoire ${repertoireId}` : ' · preview pbilet'}.
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Источник координат (6132 strict vs fieldGrid)
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={dataMode}
            onChange={(_, v) => v && setMode(v as DataMode)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="strict">strict 6132</ToggleButton>
            <ToggleButton value="fieldGrid">fieldGrid</ToggleButton>
            <ToggleButton value="compare">сравнение</ToggleButton>
          </ToggleButtonGroup>

          {diagnosticQ.isLoading ? (
            <Typography variant="body2">Загрузка tickets + fieldGrid…</Typography>
          ) : null}
          {diagnosticQ.isError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {(diagnosticQ.error as Error)?.message}
            </Alert>
          ) : null}

          {diag?.compare && dataMode !== 'compare' ? (
            <Alert severity={diag.compare.exactPct >= 95 ? 'success' : 'warning'} sx={{ mb: 1 }}>
              fieldGrid vs strict: совпадение ряда у {diag.compare.exactRowMatch}/
              {diag.compare.matched} ({diag.compare.exactPct}%), медиана Δряд={diag.compare.medianRowDelta ?? '—'}
            </Alert>
          ) : null}

          {diag?.compare && dataMode === 'compare' ? (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" gutterBottom>
                strict {diag.compare.strictCount} · fieldGrid {diag.compare.gridCount} · совпадение ряда{' '}
                {diag.compare.exactRowMatch}/{diag.compare.matched} ({diag.compare.exactPct}%)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {diag.compare.rowDeltaHistogram.map(({ delta, count }) => (
                  <Chip key={delta} size="small" label={`Δ${delta}: ${count}`} variant="outlined" />
                ))}
              </Box>
              {diag.compare.mismatchSamples.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>strict</TableCell>
                      <TableCell>fieldGrid</TableCell>
                      <TableCell>Δряд</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diag.compare.mismatchSamples.map((s) => (
                      <TableRow key={`${s.strictRow}-${s.strictSeat}`}>
                        <TableCell>
                          р{s.strictRow} м{s.strictSeat}
                        </TableCell>
                        <TableCell>
                          р{s.gridRow} м{s.gridSeat}
                        </TableCell>
                        <TableCell>{s.rowDelta}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="success.main">
                  Все strict-точки совпали по номеру ряда с fieldGrid.
                </Typography>
              )}
            </Box>
          ) : null}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {REFERENCE_SECTORS.map((s) => (
              <Chip
                key={s}
                size="small"
                label={s.replace('Сектор ', '')}
                onClick={() => setSectorDraft(s.replace('Сектор ', ''))}
                color={sectorDraft.includes(s.replace('Сектор ', '')) ? 'primary' : 'default'}
                variant={sectorDraft.includes(s.replace('Сектор ', '')) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Paper>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Как читать:</strong> ровная сетка на strict = эталон pbilet. Кривая на fieldGrid до фикса = сдвиг
          rowNumToBandIndex (один ряд → несколько band). После калибровки по strict ожидаем Δряд ≈ 0.
        </Alert>

        {active.isError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(active.error as Error)?.message}
          </Alert>
        ) : null}

        <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Сектор (фильтр)"
            value={sectorDraft}
            onChange={(e) => setSectorDraft(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          {sectors.length > 0 ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Быстрый выбор</InputLabel>
              <Select
                label="Быстрый выбор"
                value=""
                onChange={(e) => setSectorDraft(String(e.target.value))}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Сектор из данных
                </MenuItem>
                {sectors.map((s) => (
                  <MenuItem key={s} value={s.replace(/^Сектор\s+/i, '')}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            Точек: {seatCountInSector} · рядов {quality.rowLineCount} · колонн {quality.columnLineCount} · режим{' '}
            <code>{dataMode}</code>
          </Typography>
        </Paper>

        <Alert severity={verdictSeverity} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {quality.verdict === 'grid_crooked'
              ? 'Сетка кривая — алгоритм координат'
              : quality.verdict === 'grid_ok'
                ? 'Сетка ровная'
                : 'Сетка ровная — сверь с подложкой'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {quality.verdictHint}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Отклонение от прямой (ряды): {quality.maxRowChordDeviationPct}% · колонны:{' '}
            {quality.maxColumnChordDeviationPct}% · пересечения рядов: {quality.rowLineCrossings} · колонн:{' '}
            {quality.columnLineCrossings}
          </Typography>
        </Alert>

        {active.isLoading && !svgBg ? (
          <Typography>Загрузка подложки…</Typography>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: `${hallWidth} / ${hallHeight}`,
              maxHeight: 'min(85vh, 900px)',
              bgcolor: '#1a1a1a',
              overflow: 'hidden',
            }}
          >
            {svgBg ? (
              <Box
                sx={{ position: 'absolute', inset: 0, '& svg': { width: '100%', height: '100%', display: 'block' } }}
                dangerouslySetInnerHTML={{ __html: svgBg }}
              />
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#888',
                }}
              >
                Нет подложки SVG (запусти backend)
              </Box>
            )}
            <Box
              sx={{ position: 'absolute', inset: 0, '& svg': { width: '100%', height: '100%' } }}
              dangerouslySetInnerHTML={{ __html: overlaySvg }}
            />
          </Paper>
        )}

        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Link to="/test/luzhniki-cup-final-scheme">← Превью схемы pbilet</Link>
          <Link
            to={`/test/luzhniki-seat-grid?source=map&mode=${dataMode}&repertoireId=${encodeURIComponent(repertoireId)}&sector=${encodeURIComponent(sectorDraft)}`}
          >
            · live /map
          </Link>
          <Link to={`/test/luzhniki-seat-grid?mode=${dataMode}&sector=${encodeURIComponent(sectorDraft)}`}>
            · preview
          </Link>
        </Box>
      </Box>
    </>
  );
}

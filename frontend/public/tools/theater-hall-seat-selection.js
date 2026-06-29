/**
 * Выделение рядов/колонок и автозаполнение сектора в редакторах театральных залов.
 */
(function (global) {
  const overlayApi = global.TheaterHallSectorOverlay || {};
  const normSector = overlayApi.normSector || ((v) => String(v || '').trim().toLowerCase());
  const sectorsMatch = overlayApi.sectorsMatch || ((a, b) => normSector(a) === normSector(b));
  const pointInSectorPath = overlayApi.pointInSectorPath || (() => false);

  function normRow(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function rowNumbersEqual(a, b) {
    const sa = normRow(a);
    const sb = normRow(b);
    if (!sa || !sb) return false;
    if (sa === sb) return true;
    const na = parseInt(sa.replace(/[^\d-]/g, ''), 10);
    const nb = parseInt(sb.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
  }

  /** @param {Map<string, SVGPathElement>} pathByLabel */
  function findSectorPath(pathByLabel, sectorLabel) {
    if (!pathByLabel || !sectorLabel) return null;
    if (pathByLabel.get(sectorLabel)) return pathByLabel.get(sectorLabel);
    for (const [label, path] of pathByLabel.entries()) {
      if (sectorsMatch(label, sectorLabel)) return path;
    }
    return null;
  }

  /**
   * @param {{
   *   dots: { el: SVGCircleElement, xPct: number, yPct: number }[];
   *   labels: Map<string, { sector?: string, row?: string, seat?: string }>;
   *   sectorOverlay: { pathByLabel?: Map<string, SVGPathElement>, getActive?: () => string, dotInActiveSector?: Function } | null;
   *   hallW: number;
   *   hallH: number;
   *   sectorLabel: string;
   * }} opts
   */
  function collectSectorDots(opts) {
    const sector = String(opts.sectorLabel || '').trim();
    if (!sector) return [];
    const pathByLabel = opts.sectorOverlay?.pathByLabel;
    const pathEl = findSectorPath(pathByLabel, sector);
    const active = opts.sectorOverlay?.getActive?.() || '';
    const activeMatches = active && sectorsMatch(active, sector);
    const out = [];

    for (const d of opts.dots) {
      const key = d.el.dataset.key;
      if (!key) continue;
      const meta = opts.labels.get(key) || {};
      let ok = false;
      if (meta.sector && sectorsMatch(meta.sector, sector)) ok = true;
      if (!ok && pathEl) {
        ok = pointInSectorPath(pathEl, (d.xPct / 100) * opts.hallW, (d.yPct / 100) * opts.hallH);
      }
      if (!ok && activeMatches && opts.sectorOverlay?.dotInActiveSector) {
        ok = opts.sectorOverlay.dotInActiveSector(d.xPct, d.yPct, meta.sector);
      }
      if (ok) out.push({ dot: d, key, xPct: d.xPct, yPct: d.yPct, meta });
    }
    return out;
  }

  /** @param {{ xPct: number, yPct: number }[]} sectorDots */
  function clusterRows(sectorDots, corridorPx, hallH) {
    const corridor = Math.max(4, corridorPx || 18);
    const sorted = [...sectorDots].sort((a, b) => a.yPct - b.yPct || a.xPct - b.xPct);
    /** @type {{ xPct: number, yPct: number, key: string }[][]} */
    const rows = [];

    for (const dot of sorted) {
      let placed = false;
      for (const row of rows) {
        const avgY = row.reduce((sum, d) => sum + d.yPct, 0) / row.length;
        if (Math.abs(dot.yPct - avgY) / 100 * hallH <= corridor * 0.9) {
          row.push(dot);
          placed = true;
          break;
        }
      }
      if (!placed) rows.push([dot]);
    }

    for (const row of rows) row.sort((a, b) => a.xPct - b.xPct);
    return rows;
  }

  function resolveSectorContext(opts) {
    const sector = String(opts.sectorLabel || opts.sectorOverlay?.getActive?.() || '').trim();
    if (!sector) return { error: 'Укажи сектор на карте или в поле «Сектор»' };
    const sectorDots = collectSectorDots({
      dots: opts.dots,
      labels: opts.labels,
      sectorOverlay: opts.sectorOverlay,
      hallW: opts.hallW,
      hallH: opts.hallH,
      sectorLabel: sector,
    });
    if (!sectorDots.length) return { error: '0 точек в секторе «' + sector + '»' };
    const corridor = Math.max(4, opts.corridorPx || 18);
    const rows = clusterRows(sectorDots, corridor, opts.hallH);
    return { sector, sectorDots, rows, corridor };
  }

  function keysFromRowCluster(cluster) {
    return cluster.map((d) => d.key);
  }

  function selectRowByFields(opts) {
    const ctx = resolveSectorContext(opts);
    if (ctx.error) return ctx;
    const wantRow = normRow(opts.row);
    if (!wantRow) return { error: 'Укажи номер ряда в поле «Ряд»' };

    const labeled = ctx.sectorDots.filter((d) => rowNumbersEqual(d.meta.row, wantRow));
    if (labeled.length) {
      return { keys: labeled.map((d) => d.key), info: '⊙ ' + labeled.length + ' точек · row=' + wantRow };
    }

    const rowNum = parseInt(wantRow.replace(/[^\d-]/g, ''), 10);
    if (!Number.isFinite(rowNum) || rowNum < 1) {
      return { error: 'Нет точек с row=' + wantRow + '. Протяни линию (〰) или выбери 1-й/посл. ряд' };
    }
    if (rowNum > ctx.rows.length) {
      return { error: 'В секторе ' + ctx.rows.length + ' ряд(ов), нет ряда ' + rowNum };
    }
    const cluster = ctx.rows[rowNum - 1];
    return { keys: keysFromRowCluster(cluster), info: '⊙ ' + cluster.length + ' точек · геом. ряд ' + rowNum };
  }

  function selectFirstRow(opts) {
    const ctx = resolveSectorContext(opts);
    if (ctx.error) return ctx;
    if (!ctx.rows.length) return { error: 'Не удалось выделить ряды' };
    const cluster = ctx.rows[0];
    return { keys: keysFromRowCluster(cluster), info: '1-й ряд: ' + cluster.length + ' точек' };
  }

  function selectLastRow(opts) {
    const ctx = resolveSectorContext(opts);
    if (ctx.error) return ctx;
    if (!ctx.rows.length) return { error: 'Не удалось выделить ряды' };
    const cluster = ctx.rows[ctx.rows.length - 1];
    return { keys: keysFromRowCluster(cluster), info: 'Посл. ряд: ' + cluster.length + ' точек' };
  }

  function selectEdgeColumn(opts, edge) {
    const ctx = resolveSectorContext(opts);
    if (ctx.error) return ctx;
    const colBand = ctx.corridor * 0.65;
    const keys = [];

    for (const row of ctx.rows) {
      if (!row.length) continue;
      const xs = row.map((d) => d.xPct);
      const edgeX = edge === 'first' ? Math.min(...xs) : Math.max(...xs);
      for (const d of row) {
        if (Math.abs(d.xPct - edgeX) / 100 * opts.hallW <= colBand) keys.push(d.key);
      }
    }

    if (!keys.length) return { error: '0 точек в ' + (edge === 'first' ? '1-й' : 'посл.') + ' колонке' };
    return {
      keys,
      info: (edge === 'first' ? '1-я' : 'Посл.') + ' колонка: ' + keys.length + ' точек',
    };
  }

  function buildSectorFillPlan(opts) {
    const ctx = resolveSectorContext(opts);
    if (ctx.error) return ctx;
    const rowStart = Number.isFinite(opts.rowStart) ? opts.rowStart : 1;
    const seatStart = Number.isFinite(opts.seatStart) ? opts.seatStart : 1;
    /** @type {{ key: string, sector: string, row: string, seat: string }[]} */
    const plan = [];
    let rowN = rowStart;

    for (const row of ctx.rows) {
      let seatN = seatStart;
      for (const d of row) {
        plan.push({ key: d.key, sector: ctx.sector, row: String(rowN), seat: String(seatN++) });
      }
      rowN += 1;
    }

    if (!plan.length) return { error: '0 мест для заполнения' };
    return {
      sector: ctx.sector,
      plan,
      rowCount: ctx.rows.length,
      info: '↕ ' + plan.length + ' мест · ' + ctx.rows.length + ' рядов',
    };
  }

  /**
   * Применить подписи к выделению: один ряд (места по X) или колонка (ряды по Y).
   * @param {Set<string>} selected
   */
  function applySelectionLabels(opts) {
    const sector = String(opts.sector || '').trim();
    const rowField = normRow(opts.row);
    const rowStart = Number.isFinite(opts.rowStart) ? opts.rowStart : parseInt(rowField, 10) || 1;
    let seatN = Number.isFinite(opts.seatStart) ? opts.seatStart : 1;
    if (!sector) return { error: 'Сектор обязателен' };
    if (!selectedSize(opts.selected)) return { error: 'Нет выделенных точек' };

    const keys = [...opts.selected].sort((a, b) => {
      const [ax, ay] = a.split('|').map(Number);
      const [bx, by] = b.split('|').map(Number);
      if (Math.abs(ay - by) > 0.12) return ay - by;
      return ax - bx;
    });

    const ys = keys.map((k) => +k.split('|')[1]);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    const corridor = Math.max(4, opts.corridorPx || 18);
    const multiRow = ySpread / 100 * opts.hallH > corridor * 0.85;

    /** @type {{ key: string, sector: string, row: string, seat: string }[]} */
    const updates = [];

    if (multiRow) {
      const dots = keys.map((key) => {
        const [xS, yS] = key.split('|');
        return { key, xPct: +xS, yPct: +yS };
      });
      const rowClusters = clusterRows(dots, corridor, opts.hallH);
      let rowN = rowStart;
      for (const cluster of rowClusters) {
        const seat = String(seatN);
        for (const d of cluster) updates.push({ key: d.key, sector, row: String(rowN), seat });
        rowN += 1;
      }
      return { updates, info: 'Колонка: ' + updates.length + ' мест · ряды ' + rowStart + '…' + (rowN - 1) };
    }

    if (!rowField) return { error: 'Укажи ряд для одного ряда мест' };
    for (const key of keys) {
      updates.push({ key, sector, row: rowField, seat: String(seatN++) });
    }
    return { updates, info: 'Ряд «' + rowField + '»: ' + updates.length + ' мест' };
  }

  function selectedSize(selected) {
    return selected && typeof selected.size === 'number' && selected.size > 0;
  }

  global.TheaterHallSeatSelection = {
    collectSectorDots,
    clusterRows,
    selectRowByFields,
    selectFirstRow,
    selectLastRow,
    selectFirstColumn: (opts) => selectEdgeColumn(opts, 'first'),
    selectLastColumn: (opts) => selectEdgeColumn(opts, 'last'),
    buildSectorFillPlan,
    applySelectionLabels,
  };
})(window);

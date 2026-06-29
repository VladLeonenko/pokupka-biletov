/**
 * Кликабельные полигоны секторов для редакторов театральных залов (pbilet sectorMode).
 */
(function (global) {
  function normSector(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/ё/g, 'е')
      .replace(/Ё/g, 'е')
      .replace(/^сектор\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function sectorsMatch(a, b) {
    const na = normSector(a);
    const nb = normSector(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
  }

  /**
   * @param {SVGElement} pathEl
   * @param {number} xSvg
   * @param {number} ySvg
   */
  function pointInSectorPath(pathEl, xSvg, ySvg) {
    if (!pathEl || typeof pathEl.isPointInFill !== 'function') return false;
    try {
      const pt = pathEl.ownerSVGElement.createSVGPoint();
      pt.x = xSvg;
      pt.y = ySvg;
      return pathEl.isPointInFill(pt);
    } catch {
      return false;
    }
  }

  /**
   * @param {{
   *   stage: HTMLElement;
   *   hallW: number;
   *   hallH: number;
   *   sectors: { id?: string; label?: string; path?: string }[];
   *   filterSelect?: HTMLSelectElement | null;
   *   onSelect?: (label: string, pathEl: SVGPathElement | null) => void;
   * }} opts
   */
  function mount(opts) {
    const stage = opts.stage;
    const hallW = opts.hallW;
    const hallH = opts.hallH;
    const sectors = Array.isArray(opts.sectors) ? opts.sectors : [];
    const filterSelect = opts.filterSelect || null;
    const onSelect = typeof opts.onSelect === 'function' ? opts.onSelect : () => {};

    const old = stage.querySelector('svg.sector-overlay');
    if (old) old.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('sector-overlay');
    svg.setAttribute('viewBox', `0 0 ${hallW} ${hallW && hallH ? hallH : hallW}`);
    svg.setAttribute('width', String(hallW));
    svg.setAttribute('height', String(hallH));
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.pointerEvents = 'none';

    /** @type {Map<string, SVGPathElement>} */
    const pathByLabel = new Map();
    let activeLabel = '';

    for (const sec of sectors) {
      const label = String(sec?.label || sec?.id || '').trim();
      const d = String(sec?.path || '').trim();
      if (!label || !d) continue;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'rgba(59, 130, 246, 0.08)');
      p.setAttribute('stroke', 'rgba(96, 165, 250, 0.45)');
      p.setAttribute('stroke-width', '1.5');
      p.style.pointerEvents = 'all';
      p.style.cursor = 'pointer';
      p.dataset.sectorLabel = label;
      p.addEventListener('pointerenter', () => {
        if (activeLabel !== label) p.setAttribute('fill', 'rgba(59, 130, 246, 0.18)');
      });
      p.addEventListener('pointerleave', () => {
        p.setAttribute('fill', activeLabel === label ? 'rgba(34, 197, 94, 0.22)' : 'rgba(59, 130, 246, 0.08)');
      });
      p.addEventListener('click', (e) => {
        e.stopPropagation();
        setActive(label);
        onSelect(label, p);
      });
      svg.appendChild(p);
      pathByLabel.set(label, p);
    }

    stage.insertBefore(svg, stage.querySelector('svg.dots') || null);
    if (!stage.contains(svg)) stage.appendChild(svg);

    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">— все сектора —</option>';
      for (const label of pathByLabel.keys()) {
        const o = document.createElement('option');
        o.value = label;
        o.textContent = label;
        filterSelect.appendChild(o);
      }
      filterSelect.onchange = () => setActive(filterSelect.value);
    }

    function highlightPaths() {
      for (const [label, p] of pathByLabel.entries()) {
        p.setAttribute('fill', label === activeLabel ? 'rgba(34, 197, 94, 0.22)' : 'rgba(59, 130, 246, 0.08)');
        p.setAttribute('stroke', label === activeLabel ? 'rgba(34, 197, 94, 0.85)' : 'rgba(96, 165, 250, 0.45)');
      }
    }

    function setActive(label) {
      activeLabel = String(label || '').trim();
      if (filterSelect && filterSelect.value !== activeLabel) filterSelect.value = activeLabel;
      highlightPaths();
      onSelect(activeLabel, activeLabel ? pathByLabel.get(activeLabel) || null : null);
    }

    function dotInActiveSector(xPct, yPct, metaSector) {
      if (!activeLabel) return true;
      if (metaSector && sectorsMatch(metaSector, activeLabel)) return true;
      const pathEl = pathByLabel.get(activeLabel);
      if (!pathEl) return sectorsMatch(metaSector, activeLabel);
      const xSvg = (xPct / 100) * hallW;
      const ySvg = (yPct / 100) * hallH;
      return pointInSectorPath(pathEl, xSvg, ySvg);
    }

    function selectAllDotsInActiveSector(dots, labels, selectedSet) {
      if (!activeLabel) return 0;
      let n = 0;
      for (const d of dots) {
        const meta = labels.get(d.el.dataset.key) || {};
        if (!dotInActiveSector(d.xPct, d.yPct, meta.sector)) continue;
        selectedSet.add(d.el.dataset.key);
        n++;
      }
      return n;
    }

    return {
      setActive,
      getActive: () => activeLabel,
      dotInActiveSector,
      selectAllDotsInActiveSector,
      pathByLabel,
    };
  }

  global.TheaterHallSectorOverlay = {
    mount,
    normSector,
    sectorsMatch,
    pointInSectorPath,
  };
})(window);

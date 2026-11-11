import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { claimPromoPopup, fetchPromoPopupPreview } from '@/services/biletPublicApi';
import { matchesTicketsChromePath } from '@/utils/ticketsChrome';
import {
  broadcastPromoCode,
  getOrCreatePromoVisitorKey,
  markPromoModalDismissed,
  markPromoSeenForever,
  readStoredPromoGrant,
  wasPromoSeenForever,
  writeStoredPromoGrant,
} from '@/utils/promoPopupVisitor';
import styles from './BolshoiPromoPopup.module.css';

const DEFAULT_SLUG = 'except-bolshoi-10';

type Props = {
  slug?: string;
};

function formatRemain(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Глобальный попап: один раз на посетителя, на любом tickets-роуте.
 * Скидка 10% на всё кроме Большого (проверка на чекауте).
 */
export function BolshoiPromoPopup({ slug = DEFAULT_SLUG }: Props) {
  const location = useLocation();
  const onTickets = matchesTicketsChromePath(location.pathname);
  const isAdmin = location.pathname.replace(/\/+$/, '').startsWith('/admin');

  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [headline, setHeadline] = useState('Ваш купон на 10%');
  const [bodyText, setBodyText] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Скопировать код');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const remainMs = useMemo(() => {
    if (!expiresAt) return 0;
    return new Date(expiresAt).getTime() - now;
  }, [expiresAt, now]);

  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  useEffect(() => {
    if (remainMs <= 0 && (open || showBar)) {
      setOpen(false);
      setShowBar(false);
      setCode('');
      setExpiresAt(null);
    }
  }, [remainMs, open, showBar]);

  const applyGrant = useCallback(
    (g: {
      code: string;
      expiresAt: string;
      headline?: string;
      bodyText?: string;
      ctaLabel?: string;
      openModal: boolean;
    }) => {
      setCode(g.code);
      setExpiresAt(g.expiresAt);
      if (g.headline) setHeadline(g.headline);
      if (g.bodyText) setBodyText(g.bodyText);
      if (g.ctaLabel) setCtaLabel(g.ctaLabel);
      writeStoredPromoGrant({
        code: g.code,
        expiresAt: g.expiresAt,
        slug,
        dismissedModal: !g.openModal,
        headline: g.headline,
        bodyText: g.bodyText,
        ctaLabel: g.ctaLabel,
      });
      markPromoSeenForever(slug);
      broadcastPromoCode(g.code);
      setOpen(g.openModal);
      setShowBar(!g.openModal);
    },
    [slug],
  );

  useEffect(() => {
    if (!onTickets || isAdmin) return;
    let cancelled = false;
    let delayTimer: number | undefined;

    (async () => {
      const stored = readStoredPromoGrant(slug);
      if (stored) {
        if (cancelled) return;
        applyGrant({
          code: stored.code,
          expiresAt: stored.expiresAt,
          headline: stored.headline,
          bodyText: stored.bodyText,
          ctaLabel: stored.ctaLabel,
          // Уже видел: только плашка, без повторной модалки
          openModal: false,
        });
        return;
      }

      // Уже получал когда-то (даже если код истёк) — больше не показываем
      if (wasPromoSeenForever(slug)) return;

      const preview = await fetchPromoPopupPreview({ slug });
      if (cancelled || !preview.eligible || !preview.campaign) return;

      setHeadline(preview.campaign.headline);
      setBodyText(preview.campaign.bodyText);
      setCtaLabel(preview.campaign.ctaLabel || 'Скопировать код');

      const delay = Math.max(0, Number(preview.campaign.delayMs) || 2500);
      delayTimer = window.setTimeout(async () => {
        if (cancelled) return;
        const visitorKey = getOrCreatePromoVisitorKey();
        const claim = await claimPromoPopup({ visitorKey, slug });
        if (cancelled) return;
        if (claim.alreadyClaimed) {
          markPromoSeenForever(slug);
          return;
        }
        if (!claim.ok || !claim.code || !claim.expiresAt) return;
        applyGrant({
          code: claim.code,
          expiresAt: claim.expiresAt,
          headline: claim.headline,
          bodyText: claim.bodyText,
          ctaLabel: claim.ctaLabel,
          openModal: true,
        });
      }, delay);
    })().catch(() => {
      /* silent */
    });

    return () => {
      cancelled = true;
      if (delayTimer) window.clearTimeout(delayTimer);
    };
  }, [onTickets, isAdmin, slug, applyGrant]);

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
    broadcastPromoCode(code);
  };

  const onDismissModal = () => {
    markPromoModalDismissed(slug);
    markPromoSeenForever(slug);
    setOpen(false);
    if (code && remainMs > 0) setShowBar(true);
  };

  if (!onTickets || isAdmin || !code || remainMs <= 0) return null;

  return (
    <>
      {open ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={headline}>
          <div className={styles.card}>
            <button type="button" className={styles.close} aria-label="Закрыть" onClick={onDismissModal}>
              ×
            </button>
            <span className={styles.ornament} aria-hidden />
            <p className={styles.eyebrow}>Персональный купон · 10%</p>
            <h2 className={styles.headline}>{headline}</h2>
            {bodyText ? <p className={styles.body}>{bodyText}</p> : null}
            <div className={styles.codeBox}>
              <span className={styles.code}>{code}</span>
            </div>
            <p className={styles.timer}>
              Действует ещё <strong>{formatRemain(remainMs)}</strong>
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={onCopy}>
                {copied ? 'Скопировано' : ctaLabel}
              </button>
              <button type="button" className={styles.ghost} onClick={onDismissModal}>
                Выбрать места со скидкой
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBar && !open ? (
        <div className={styles.bar} role="status">
          <span className={styles.barCode}>{code}</span>
          <span className={styles.barTimer}>{formatRemain(remainMs)}</span>
          <button type="button" className={styles.barBtn} onClick={onCopy}>
            {copied ? 'OK' : 'Копировать'}
          </button>
        </div>
      ) : null}
    </>
  );
}

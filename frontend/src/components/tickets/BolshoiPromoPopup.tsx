import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
/** Фоллбек, если в кампании нет delay_ms */
const DEFAULT_SHOW_AFTER_MS = 12_000;

type Props = {
  slug?: string;
};

function formatRemain(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type GrantPayload = {
  code: string;
  expiresAt: string;
  headline?: string;
  bodyText?: string;
  ctaLabel?: string;
};

/**
 * Глобальный попап: один раз на посетителя, на любом tickets-роуте.
 * Скидка 10% на всё кроме Большого (проверка на чекауте).
 * Показ через ~10–15с от входа (delay кампании), claim стартует сразу.
 */
export function BolshoiPromoPopup({ slug = DEFAULT_SLUG }: Props) {
  const location = useLocation();
  const onTickets = matchesTicketsChromePath(location.pathname);
  const isAdmin = location.pathname.replace(/\/+$/, '').startsWith('/admin');

  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [headline, setHeadline] = useState('Ваш промокод на 10%');
  const [bodyText, setBodyText] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Скопировать код');
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const grantRef = useRef<GrantPayload | null>(null);
  const shownRef = useRef(false);

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

  const persistAndBroadcast = useCallback(
    (g: GrantPayload, dismissedModal: boolean) => {
      writeStoredPromoGrant({
        code: g.code,
        expiresAt: g.expiresAt,
        slug,
        dismissedModal,
        headline: g.headline,
        bodyText: g.bodyText,
        ctaLabel: g.ctaLabel,
      });
      markPromoSeenForever(slug);
      broadcastPromoCode(g.code);
    },
    [slug],
  );

  const revealModal = useCallback(
    (g: GrantPayload) => {
      if (shownRef.current) return;
      shownRef.current = true;
      setCode(g.code);
      setExpiresAt(g.expiresAt);
      if (g.headline) setHeadline(g.headline);
      if (g.bodyText) setBodyText(g.bodyText);
      if (g.ctaLabel) setCtaLabel(g.ctaLabel);
      persistAndBroadcast(g, false);
      setOpen(true);
      setShowBar(false);
    },
    [persistAndBroadcast],
  );

  const revealBarOnly = useCallback(
    (g: GrantPayload) => {
      setCode(g.code);
      setExpiresAt(g.expiresAt);
      if (g.headline) setHeadline(g.headline);
      if (g.bodyText) setBodyText(g.bodyText);
      if (g.ctaLabel) setCtaLabel(g.ctaLabel);
      persistAndBroadcast(g, true);
      setOpen(false);
      setShowBar(true);
      shownRef.current = true;
    },
    [persistAndBroadcast],
  );

  useEffect(() => {
    if (!onTickets || isAdmin) return;
    let cancelled = false;
    let showTimer: number | undefined;

    const stored = readStoredPromoGrant(slug);
    if (stored) {
      revealBarOnly({
        code: stored.code,
        expiresAt: stored.expiresAt,
        headline: stored.headline,
        bodyText: stored.bodyText,
        ctaLabel: stored.ctaLabel,
      });
      return;
    }
    if (wasPromoSeenForever(slug)) return;

    const bootAt = Date.now();

    (async () => {
      const preview = await fetchPromoPopupPreview({ slug }).catch(() => null);
      if (cancelled) return;
      if (!preview?.eligible || !preview.campaign) return;

      setHeadline(preview.campaign.headline);
      setBodyText(preview.campaign.bodyText);
      setCtaLabel(preview.campaign.ctaLabel || 'Скопировать код');

      const showAfterMs = Math.min(
        15_000,
        Math.max(8_000, Number(preview.campaign.delayMs) || DEFAULT_SHOW_AFTER_MS),
      );

      // Claim сразу — к моменту показа код уже есть
      const visitorKey = getOrCreatePromoVisitorKey();
      const claim = await claimPromoPopup({ visitorKey, slug }).catch(() => null);
      if (cancelled) return;
      if (claim?.alreadyClaimed) {
        markPromoSeenForever(slug);
        return;
      }
      if (!claim?.ok || !claim.code || !claim.expiresAt) return;

      const grant: GrantPayload = {
        code: claim.code,
        expiresAt: claim.expiresAt,
        headline: claim.headline || preview.campaign.headline,
        bodyText: claim.bodyText || preview.campaign.bodyText,
        ctaLabel: claim.ctaLabel || preview.campaign.ctaLabel,
      };
      grantRef.current = grant;

      const elapsed = Date.now() - bootAt;
      const wait = Math.max(0, showAfterMs - elapsed);
      showTimer = window.setTimeout(() => {
        if (cancelled || !grantRef.current) return;
        revealModal(grantRef.current);
      }, wait);
    })().catch(() => {
      /* silent */
    });

    return () => {
      cancelled = true;
      if (showTimer) window.clearTimeout(showTimer);
    };
  }, [onTickets, isAdmin, slug, revealBarOnly, revealModal]);

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
            <p className={styles.eyebrow}>Персональный промокод · 10%</p>
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

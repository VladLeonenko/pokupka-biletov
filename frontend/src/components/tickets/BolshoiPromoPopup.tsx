import { useCallback, useEffect, useMemo, useState } from 'react';
import { claimPromoPopup, fetchPromoPopupPreview } from '@/services/biletPublicApi';
import {
  broadcastPromoCode,
  getOrCreatePromoVisitorKey,
  markPromoModalDismissed,
  readStoredPromoGrant,
  writeStoredPromoGrant,
} from '@/utils/promoPopupVisitor';
import styles from './BolshoiPromoPopup.module.css';

const DEFAULT_SLUG = 'bolshoi-10';

type Props = {
  repertoireId: string;
  venueLabel?: string | null;
  slug?: string;
};

function formatRemain(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BolshoiPromoPopup({ repertoireId, venueLabel, slug = DEFAULT_SLUG }: Props) {
  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [headline, setHeadline] = useState('Ваш купон Большого');
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
      broadcastPromoCode(g.code);
      setOpen(g.openModal);
      setShowBar(!g.openModal);
    },
    [slug],
  );

  useEffect(() => {
    if (!repertoireId) return;
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
          openModal: !stored.dismissedModal,
        });
        return;
      }

      const preview = await fetchPromoPopupPreview({
        repertoireId,
        venue: venueLabel || undefined,
        slug,
      });
      if (cancelled || !preview.eligible || !preview.campaign) return;

      setHeadline(preview.campaign.headline);
      setBodyText(preview.campaign.bodyText);
      setCtaLabel(preview.campaign.ctaLabel || 'Скопировать код');

      const delay = Math.max(0, Number(preview.campaign.delayMs) || 2500);
      delayTimer = window.setTimeout(async () => {
        if (cancelled) return;
        const visitorKey = getOrCreatePromoVisitorKey();
        const claim = await claimPromoPopup({
          visitorKey,
          repertoireId,
          venue: venueLabel || undefined,
          slug,
        });
        if (cancelled || !claim.ok || !claim.code || !claim.expiresAt) return;
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
  }, [repertoireId, venueLabel, slug, applyGrant]);

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
    setOpen(false);
    if (code && remainMs > 0) setShowBar(true);
  };

  if (!code || remainMs <= 0) return null;

  return (
    <>
      {open ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={headline}>
          <div className={styles.card}>
            <button type="button" className={styles.close} aria-label="Закрыть" onClick={onDismissModal}>
              ×
            </button>
            <span className={styles.ornament} aria-hidden />
            <p className={styles.eyebrow}>Большой театр · персональный купон</p>
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

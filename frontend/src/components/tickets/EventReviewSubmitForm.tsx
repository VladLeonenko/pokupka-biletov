import { useState, type FormEvent } from 'react';
import { submitRepertoireReview } from '@/services/biletPublicApi';
import styles from './EventReviewSubmitForm.module.css';

type Props = {
  repertoireId: string;
  eventTitle: string;
};

export function EventReviewSubmitForm({ repertoireId, eventTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [email, setEmail] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [stars, setStars] = useState(5);
  const [body, setBody] = useState('');
  const [ticket, setTicket] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!ticket) {
      setErr('Приложите фото или PDF билета');
      return;
    }
    setBusy(true);
    try {
      const res = await submitRepertoireReview(repertoireId, {
        author: author.trim() || 'Зритель',
        email: email.trim(),
        stars,
        body: body.trim(),
        orderRef: orderRef.trim() || undefined,
        ticket,
      });
      setDone(res.message);
      setOpen(false);
      setBody('');
      setTicket(null);
      setOrderRef('');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Не удалось отправить');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Отзыв на проверке</p>
        <p className={styles.doneText}>{done}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={styles.teaser}>
        <p className={styles.teaserText}>
          Были на «{eventTitle}»? Напишите, как прошло — приложите билет, мы лично сверим
          подлинность и только потом опубликуем.
        </p>
        <button type="button" className={styles.openBtn} onClick={() => setOpen(true)}>
          Оставить отзыв
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <p className={styles.formLead}>
        К отзыву нужен скан или фото билета (или PDF). Мы проверяем каждую заявку вручную — без
        подтверждённого билета отзыв не появится на странице.
      </p>

      <label className={styles.label}>
        Оценка
        <div className={styles.starsRow} role="group" aria-label="Оценка от 1 до 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.starBtn} ${n <= stars ? styles.starOn : ''}`}
              aria-label={`${n} из 5`}
              aria-pressed={n <= stars}
              onClick={() => setStars(n)}
            >
              ★
            </button>
          ))}
        </div>
      </label>

      <label className={styles.label}>
        Ваше имя
        <input
          className={styles.input}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Как подписать отзыв"
          maxLength={80}
          autoComplete="name"
        />
      </label>

      <label className={styles.label}>
        Email <span className={styles.req}>*</span>
        <input
          className={styles.input}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="для связи при проверке"
          autoComplete="email"
        />
      </label>

      <label className={styles.label}>
        Номер заказа / билета
        <input
          className={styles.input}
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value)}
          placeholder="необязательно, ускоряет проверку"
          maxLength={80}
        />
      </label>

      <label className={styles.label}>
        Текст отзыва <span className={styles.req}>*</span>
        <textarea
          className={styles.textarea}
          required
          minLength={20}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Что запомнилось: постановка, зал, атмосфера…"
        />
      </label>

      <label className={styles.label}>
        Билет (фото / PDF) <span className={styles.req}>*</span>
        <input
          className={styles.file}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.heic"
          required
          onChange={(e) => setTicket(e.target.files?.[0] ?? null)}
        />
        <span className={styles.fileHint}>
          {ticket ? ticket.name : 'JPG, PNG, WebP или PDF · до 8 МБ'}
        </span>
      </label>

      {err ? (
        <p className={styles.err} role="alert">
          {err}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={() => setOpen(false)} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className={styles.submitBtn} disabled={busy}>
          {busy ? 'Отправляем…' : 'Отправить на проверку'}
        </button>
      </div>
    </form>
  );
}

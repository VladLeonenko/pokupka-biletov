import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicCase } from '@/services/publicApi';
import { submitForm } from '@/services/cmsApi';
import { useToast } from '@/components/common/ToastProvider';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import styles from './ToolsSection.module.css';

const textStyles = {
  sectionTitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 700,
    fontSize: '48px',
    lineHeight: 1.5,
    color: '#141414',
    margin: 0,
  },
  description: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 300,
    fontSize: '24px',
    lineHeight: 1.5,
    color: '#141414',
    margin: 0,
  },
  ctaResult: {
    fontFamily: "'Open Sans', sans-serif",
    fontWeight: 400,
    fontSize: '20px',
    lineHeight: 1.6,
    color: '#141414',
    margin: 0,
    listStyle: 'disc',
  },
};

const DEFAULT_CTA_RESULTS = ['Трафик +150%', 'Конверсия +40%', 'Продажи x3 за 6 месяцев'];

export function ToolsSection() {
  const { slug } = useParams<{ slug?: string }>();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: caseData } = useQuery({
    queryKey: ['publicCase', slug],
    queryFn: () => getPublicCase(slug!),
    enabled: !!slug,
  });

  const toolsData = caseData?.contentJson?.tools || {};
  const title = toolsData.title || 'Инструменты';
  const description = toolsData.description || '';
  const ctaResults: string[] = (toolsData.ctaResults || DEFAULT_CTA_RESULTS).filter(Boolean);
  const tools = toolsData.items || toolsData.list || [];

  const projectName = caseData?.title || 'Проект';

  const openForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: `Хочу рассчитать стоимость проекта по кейсу «${projectName}»`,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast('Заполните имя и email', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitForm('case-cost-form', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || '',
        message: formData.message.trim(),
        caseTitle: projectName,
        caseSlug: slug,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      });
      showToast('Спасибо! Ваша заявка отправлена.', 'success');
      setFormOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Ошибка отправки', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tools.length === 0) {
    return null;
  }

  const rows = [];
  for (let i = 0; i < tools.length; i += 3) {
    rows.push(tools.slice(i, i + 3));
  }

  return (
    <section className={styles.tools}>
      <div className={styles.toolsContainer}>
        <h2 style={textStyles.sectionTitle}>{title}</h2>

        <div className={styles.toolsContent}>
          <div className={styles.toolsDescription}>
            {description && (
              <div className={styles.descriptionText}>
                {description.split('\n').map((line: string, i: number) => (
                  <p key={i} style={textStyles.description}>{line}</p>
                ))}
              </div>
            )}

            <div className={styles.ctaBlock}>
              <p style={textStyles.description}>Понравился кейс {projectName}?</p>
              <p style={textStyles.description}>{projectName} — реальный результат нашей команды:</p>
              {ctaResults.length > 0 && (
                <ul className={styles.ctaResultsList}>
                  {ctaResults.map((item, i) => (
                    <li key={i} style={textStyles.ctaResult}>{item}</li>
                  ))}
                </ul>
              )}
              <p style={textStyles.description}>
                Результаты, которые меняют бизнес. Ваш проект следующий!
              </p>
              <button className={styles.ctaButton} onClick={openForm}>
                Запишитесь на расчёт стоимости
              </button>
            </div>
          </div>

          <div className={styles.toolsGrid}>
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.toolsRow}>
                {row.map((tool: any, toolIndex: number) => (
                  <div key={toolIndex} className={styles.toolCard} title={tool.name}>
                    <img
                      src={tool.icon}
                      alt={tool.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Расчёт стоимости по кейсу «{projectName}»
          <IconButton onClick={() => setFormOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Имя"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Телефон"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Сообщение"
              multiline
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={<SendIcon />}
              sx={{ bgcolor: '#ffbb00', color: '#141414', fontWeight: 700, '&:hover': { bgcolor: '#e5a800', color: '#141414' } }}
            >
              Отправить
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </section>
  );
}

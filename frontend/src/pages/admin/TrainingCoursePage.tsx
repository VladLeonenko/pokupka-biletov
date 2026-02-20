import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  FormControl,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCourse,
  getCourseProgress,
  getQuestions,
  updateCourseProgress,
  markCourseTestPassed,
  submitQuiz,
  type CoursePage,
  type CourseWithPages,
  type TrainingQuestion,
  type ContentBlock,
} from '@/services/salesAcademyApi';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizIcon from '@mui/icons-material/Quiz';

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const vid = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
      return vid ? `https://www.youtube.com/embed/${vid}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const vid = u.pathname.split('/').filter(Boolean).pop();
      return vid ? `https://player.vimeo.com/video/${vid}` : null;
    }
    return url;
  } catch {
    return null;
  }
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <Typography sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>{block.text}</Typography>;
    case 'list':
      return (
        <Box component={block.ordered ? 'ol' : 'ul'} sx={{ pl: 2.5, mb: 1.5, '& li': { mb: 0.5 } }}>
          {(block.items || []).map((item, i) => (
            <Typography key={i} component="li" variant="body2">{item}</Typography>
          ))}
        </Box>
      );
    case 'dropdown':
      return (
        <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1.5, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{block.title}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{block.content}</Typography>
          </AccordionDetails>
        </Accordion>
      );
    case 'checkbox':
      return (
        <Box sx={{ mb: 1.5 }}>
          {block.title && <Typography variant="subtitle2" sx={{ mb: 1 }}>{block.title}</Typography>}
          <List dense disablePadding>
            {(block.items || []).map((item, i) => (
              <ChecklistItem key={i} label={item} />
            ))}
          </List>
        </Box>
      );
    case 'image':
      return (
        <Box sx={{ mb: 1.5 }}>
          <Box
            component="img"
            src={block.url}
            alt={block.alt || ''}
            sx={{ maxWidth: '100%', height: 'auto', borderRadius: 1, border: 1, borderColor: 'divider' }}
            loading="lazy"
          />
        </Box>
      );
    case 'video': {
      const embedUrl = getVideoEmbedUrl(block.url);
      if (!embedUrl) return <Typography variant="body2" color="error">Неверная ссылка на видео</Typography>;
      return (
        <Box sx={{ mb: 1.5, position: 'relative', pb: '56.25%', height: 0, overflow: 'hidden' }}>
          <Box
            component="iframe"
            src={embedUrl}
            allowFullScreen
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 1 }}
          />
        </Box>
      );
    }
    case 'table': {
      const headers = block.headers || [];
      const rows = block.rows || [];
      if (headers.length === 0 && rows.length === 0) return null;
      return (
        <Box sx={{ overflowX: 'auto', mb: 1.5 }}>
          <Table size="small" sx={{ minWidth: 200 }}>
            <TableHead><TableRow>{headers.map((h, i) => <TableCell key={i} sx={{ fontWeight: 600 }}>{h || ''}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map((row, ri) => (
                <TableRow key={ri}>{row.map((cell, ci) => <TableCell key={ci}>{cell || ''}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      );
    }
    default:
      return null;
  }
}

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <ListItem disablePadding sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: 36, mt: -0.5 }}>
        <Checkbox
          size="small"
          icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
          checkedIcon={<CheckBoxIcon fontSize="small" color="primary" />}
          checked={checked}
          onChange={() => setChecked(!checked)}
        />
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{ variant: 'body2', sx: { textDecoration: checked ? 'line-through' : 'none', color: checked ? 'text.secondary' : 'text.primary' } }}
      />
    </ListItem>
  );
}

function PageContent({ page, course }: { page: CoursePage; course: CourseWithPages }) {
  if (page.page_type === 'cover') {
    const blocks = page.content_blocks && Array.isArray(page.content_blocks) ? page.content_blocks : null;
    return (
      <Box>
        {course.cover_image_url && (
          <Box component="img" src={course.cover_image_url} alt="" sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 2, mb: 2 }} />
        )}
        <Typography variant="h6" sx={{ mb: 2 }}>{page.title || 'Введение'}</Typography>
        {blocks && blocks.length > 0 ? (
          blocks.map((b, i) => <BlockRenderer key={i} block={b} />)
        ) : (
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{course.cover_description || ''}</Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Примерное время на тест: {course.estimated_test_minutes} мин
        </Typography>
      </Box>
    );
  }
  if (page.page_type === 'objection') {
    const objBlocks = page.content_blocks && Array.isArray(page.content_blocks) ? page.content_blocks : null;
    return (
      <Box>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
          Возражение
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>{page.objection_text || page.title}</Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
          Решение
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{page.solution_text || ''}</Typography>
        {objBlocks && objBlocks.length > 0 && (
          <Box sx={{ mt: 2 }}>{objBlocks.map((b, i) => <BlockRenderer key={i} block={b} />)}</Box>
        )}
      </Box>
    );
  }
  // content — rich blocks или fallback на plain content
  const blocks = page.content_blocks && Array.isArray(page.content_blocks) ? page.content_blocks : null;
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>{page.title}</Typography>
      {blocks && blocks.length > 0 ? (
        blocks.map((b, i) => <BlockRenderer key={i} block={b} />)
      ) : (
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{page.content || ''}</Typography>
      )}
    </Box>
  );
}

function QuizDialog({
  open,
  onClose,
  questions,
  courseSlug,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  questions: TrainingQuestion[];
  courseSlug: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [openAnswer, setOpenAnswer] = useState('');

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnswers([]);
      setFinished(false);
      setScore(0);
      setOpenAnswer('');
    }
  }, [open]);

  const q = questions[step];
  const isOpenEnded = !q?.options?.length || q.options.length === 0;
  const opts = Array.isArray(q?.options) ? q.options.filter(Boolean) : [];
  const isLast = step === questions.length - 1;

  const handleAnswer = (val: number | string) => {
    const newAnswers = [...answers];
    newAnswers[step] = val;
    setAnswers(newAnswers);
    if (isLast) {
      const closedQs = questions.filter((qu) => qu.options?.length > 0 && qu.correct_index >= 0);
      let correct = 0;
      questions.forEach((qu, idx) => {
        if (qu.options?.length > 0 && qu.correct_index >= 0 && newAnswers[idx] === qu.correct_index) correct++;
      });
      const pct = closedQs.length > 0 ? Math.round((correct / closedQs.length) * 100) : 100;
      setScore(pct);
      setFinished(true);
      const answersPayload = questions.map((qu, i) => ({
        question_id: qu.id,
        question_index: i,
        answer_index: typeof newAnswers[i] === 'number' ? newAnswers[i] : undefined,
        answer_text: typeof newAnswers[i] === 'string' ? newAnswers[i] : undefined,
      }));
      submitQuiz({
        question_type: `course_${courseSlug}`,
        score_percent: pct,
        total_questions: questions.length,
        correct_count: correct,
        answers: answersPayload,
      }).then(() => markCourseTestPassed(courseSlug, pct)).then(onComplete).catch(() => {});
    } else {
      setStep(step + 1);
      setOpenAnswer('');
    }
  };

  const isOpenQuestion = (qu: TrainingQuestion) => !qu.options?.length || qu.correct_index < 0;

  if (!open || questions.length === 0) return null;
  if (finished) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon color="primary" /> Тест пройден!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h4" color="primary" sx={{ textAlign: 'center', my: 2 }}>
            {score}%
          </Typography>
          <Typography sx={{ textAlign: 'center' }}>
            {score >= 80
              ? 'Отлично! Прогресс обновлён.'
              : score >= 60
                ? 'Хороший результат.'
                : 'Перечитайте материалы и попробуйте снова.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>Тест по курсу</DialogTitle>
      <DialogContent>
        <LinearProgress
          variant="determinate"
          value={((step + 1) / questions.length) * 100}
          sx={{ mb: 2 }}
        />
        <Typography variant="body1" sx={{ mb: 2 }}>
          {q?.question_text}
        </Typography>
        {isOpenEnded ? (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Введите ответ..."
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
            />
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => handleAnswer(openAnswer)} disabled={!openAnswer.trim()}>
              {isLast ? 'Завершить' : 'Далее'}
            </Button>
          </Box>
        ) : (
          <RadioGroup>
            {opts.map((opt, idx) => (
              <FormControlLabel
                key={idx}
                value={idx}
                control={<Radio />}
                label={opt}
                onClick={() => handleAnswer(idx)}
              />
            ))}
          </RadioGroup>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TrainingCoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => getCourse(slug!),
    enabled: !!slug,
  });
  const { data: progress } = useQuery({
    queryKey: ['course-progress', slug],
    queryFn: () => getCourseProgress(slug!),
    enabled: !!slug,
  });
  const { data: questions } = useQuery({
    queryKey: ['course-questions', slug],
    queryFn: () => getQuestions(undefined, slug),
    enabled: !!slug && quizOpen,
  });

  const updateProgress = useMutation({
    mutationFn: ({ toPage }: { toPage: number }) =>
      updateCourseProgress(slug!, toPage, toPage + 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-progress', slug] }),
  });

  useEffect(() => {
    if (progress?.lastPageIndex != null && pageIndex === 0) {
      setPageIndex(progress.lastPageIndex);
    }
  }, [progress?.lastPageIndex]);

  if (!slug || isLoading || !course) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  const pages = course.pages || [];
  const totalPages = pages.length;
  const currentPage = pages[pageIndex];
  const isLastContentPage = pageIndex === totalPages - 1;
  const isCover = currentPage?.page_type === 'cover';
  const canStartQuiz = isLastContentPage && !progress?.testPassed;

  const handleNext = () => {
    if (canStartQuiz) {
      setQuizOpen(true);
    } else if (pageIndex < totalPages - 1) {
      const next = pageIndex + 1;
      setPageIndex(next);
      updateProgress.mutate({ toPage: next });
    }
  };

  const handlePrev = () => {
    if (pageIndex > 0) setPageIndex(pageIndex - 1);
  };

  return (
    <Box sx={{ p: 2, maxWidth: 720, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/sales-academy')} sx={{ mb: 2 }}>
        Назад к академии
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">{course.title}</Typography>
        <Chip
          label={`${Math.min(pageIndex + 1, totalPages)} / ${totalPages}`}
          size="small"
          color="primary"
          variant="outlined"
        />
        {progress?.testPassed && (
          <Chip icon={<EmojiEventsIcon />} label="Тест пройден" color="success" size="small" />
        )}
      </Box>

      <LinearProgress
        variant="determinate"
        value={totalPages > 0 ? ((pageIndex + 1) / totalPages) * 100 : 0}
        sx={{ mb: 2, height: 8, borderRadius: 4 }}
      />

      <Card variant="outlined">
        <CardContent>
          <PageContent page={currentPage} course={course} />
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handlePrev} disabled={pageIndex === 0}>
          Назад
        </Button>
        {canStartQuiz ? (
          <Button variant="contained" startIcon={<QuizIcon />} onClick={() => setQuizOpen(true)}>
            Пройти тест ({questions?.length || 0} вопросов)
          </Button>
        ) : (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
            {isLastContentPage ? 'К тесту' : 'Далее'}
          </Button>
        )}
      </Box>

      {progress?.testPassed && (
        <Button variant="outlined" startIcon={<QuizIcon />} onClick={() => setQuizOpen(true)} sx={{ mt: 2 }}>
          Пройти тест повторно
        </Button>
      )}

      <QuizDialog
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        questions={questions || []}
        courseSlug={slug}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['course-progress', slug] });
          setQuizOpen(false);
        }}
      />
    </Box>
  );
}

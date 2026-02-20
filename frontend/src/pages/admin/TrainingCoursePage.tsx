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
} from '@mui/material';
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
} from '@/services/salesAcademyApi';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizIcon from '@mui/icons-material/Quiz';

function PageContent({ page, course }: { page: CoursePage; course: CourseWithPages }) {
  if (page.page_type === 'cover') {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>{page.title || 'Введение'}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{course.cover_description || ''}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Примерное время на тест: {course.estimated_test_minutes} мин
        </Typography>
      </Box>
    );
  }
  if (page.page_type === 'objection') {
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
      </Box>
    );
  }
  // content
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>{page.title}</Typography>
      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{page.content || ''}</Typography>
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
      // Считаем только закрытые вопросы
      const closedQs = questions.filter((qu) => qu.options?.length > 0 && qu.correct_index >= 0);
      const closedIdx = questions.map((_, i) => i).filter((i) => !isOpenQuestion(questions[i]));
      let correct = 0;
      closedIdx.forEach((idx) => {
        if (newAnswers[idx] === questions[idx].correct_index) correct++;
      });
      const pct = closedQs.length > 0 ? Math.round((correct / closedQs.length) * 100) : 100;
      setScore(pct);
      setFinished(true);
      submitQuiz({
        question_type: `course_${courseSlug}`,
        score_percent: pct,
        total_questions: questions.length,
        correct_count: correct,
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

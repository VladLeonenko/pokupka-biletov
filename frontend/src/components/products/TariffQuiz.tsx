import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Button, Stepper, Step, StepLabel, Paper, RadioGroup, FormControlLabel, Radio, FormControl, Card, CardContent, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CheckCircle, ArrowForward, ArrowBack } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBase } from '@/utils/apiBase';

const MotionPaper = motion.create(Paper);
const MotionCard = motion.create(Card);

interface QuizOption {
  id: number;
  optionText: string;
  optionDescription?: string;
  pointsStart: number;
  pointsBusiness: number;
  pointsPremium: number;
}

interface QuizQuestion {
  id: number;
  questionText: string;
  questionType: string;
  options: QuizOption[];
}

interface TariffQuizProps {
  onComplete: (recommendedTariff: string) => void;
}

const tariffNames: Record<string, string> = {
  start: 'START',
  business: 'Малый бизнес',
  premium: 'PPRIME',
};

async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const base = getApiBase();
  const response = await fetch(`${base}/api/public/quiz/questions`);
  if (!response.ok) throw new Error('Failed to fetch quiz questions');
  return response.json();
}

async function submitQuizResult(recommendedTariff: string, answers: Record<number, number>, userEmail?: string) {
  const base = getApiBase();
  const response = await fetch(`${base}/api/public/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recommendedTariff,
      answers,
      userEmail
    })
  });
  if (!response.ok) throw new Error('Failed to submit quiz result');
  return response.json();
}

export function TariffQuiz({ onComplete }: TariffQuizProps) {
  const { data: questions, isLoading } = useQuery({
    queryKey: ['quiz-questions'],
    queryFn: fetchQuizQuestions,
  });

  const questionList = questions ?? [];

  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<Record<string, number>>({ start: 0, business: 0, premium: 0 });
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [recommendedTariff, setRecommendedTariff] = useState<string>('');

  // Сбрасываем при загрузке новых вопросов (стабильная зависимость по длине)
  const questionsLength = questionList.length;
  useEffect(() => {
    if (questionsLength > 0) {
      setScores({ start: 0, business: 0, premium: 0 });
      setAnswers({});
      setActiveStep(0);
    }
  }, [questionsLength]);

  const handleAnswer = (questionId: number, optionId: number, option: QuizOption) => {
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);

    // Обновляем очки
    const newScores = { ...scores };
    newScores.start = (newScores.start || 0) + option.pointsStart;
    newScores.business = (newScores.business || 0) + option.pointsBusiness;
    newScores.premium = (newScores.premium || 0) + option.pointsPremium;
    setScores(newScores);
  };

  const handleNext = () => {
    if (activeStep < questionList.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // Определяем рекомендуемый тариф
      const recommended = Object.keys(scores).reduce((a, b) =>
        scores[a] > scores[b] ? a : b
      );
      setRecommendedTariff(recommended);
      setEmailDialogOpen(true);
    }
  };

  const handleBack = () => {
    setActiveStep(Math.max(0, activeStep - 1));
  };

  const handleSubmitResult = async () => {
    try {
      await submitQuizResult(recommendedTariff, answers, userEmail || undefined);
      setEmailDialogOpen(false);
      onComplete(recommendedTariff);
    } catch (error) {
      console.error('Error submitting quiz result:', error);
      // Все равно вызываем onComplete даже если отправка не удалась
      setEmailDialogOpen(false);
      onComplete(recommendedTariff);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography>Загрузка вопросов...</Typography>
      </Box>
    );
  }

  if (!questionList.length) {
    return null;
  }

  const currentQuestion = questionList[activeStep];
  const isLastStep = activeStep === questionList.length - 1;
  const canProceed = answers[currentQuestion?.id] !== undefined;

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
        Какой тариф вам подходит?
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Ответьте на несколько вопросов, и мы подберем оптимальный тариф
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {questionList.map((q) => (
          <Step key={q.id}>
            <StepLabel>{q.questionText}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <MotionPaper
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        sx={{ p: 4, maxWidth: 800, mx: 'auto' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Typography variant="h5" gutterBottom>
              {currentQuestion.questionText}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Вопрос {activeStep + 1} из {questionList.length}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQuestion.id]?.toString() || ''}
                onChange={(e) => {
                  const optionId = parseInt(e.target.value);
                  const option = currentQuestion.options.find((o) => o.id === optionId);
                  if (option) {
                    handleAnswer(currentQuestion.id, optionId, option);
                  }
                }}
              >
                {currentQuestion.options.map((option) => (
                  <MotionCard
                    key={option.id}
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: answers[currentQuestion.id] === option.id ? 2 : 1,
                      borderColor:
                        answers[currentQuestion.id] === option.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => {
                      handleAnswer(currentQuestion.id, option.id, option);
                    }}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={option.id.toString()}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {option.optionText}
                            </Typography>
                            {option.optionDescription && (
                              <Typography variant="caption" color="text.secondary">
                                {option.optionDescription}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </CardContent>
                  </MotionCard>
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                startIcon={<ArrowBack />}
              >
                Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canProceed}
                endIcon={isLastStep ? <CheckCircle /> : <ArrowForward />}
              >
                {isLastStep ? 'Узнать результат' : 'Далее'}
              </Button>
            </Box>
          </motion.div>
        </AnimatePresence>
      </MotionPaper>

      {/* Диалог для ввода email после завершения */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)}>
        <DialogTitle>Отлично! Ваш рекомендуемый тариф: {tariffNames[recommendedTariff] || recommendedTariff}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Оставьте email, чтобы получить детальное коммерческое предложение
          </Typography>
          <TextField
            fullWidth
            type="email"
            label="Email (необязательно)"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEmailDialogOpen(false);
            onComplete(recommendedTariff);
          }}>
            Пропустить
          </Button>
          <Button variant="contained" onClick={handleSubmitResult}>
            Получить КП
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export { tariffNames };

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

interface QuizProps {
  onComplete?: (recommendedTariff: string) => void;
  showEmailDialog?: boolean;
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
      userEmail,
    }),
  });
  if (!response.ok) throw new Error('Failed to submit quiz result');
  return response.json();
}

export function Quiz({ onComplete, showEmailDialog = true }: QuizProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<Record<string, number>>({ start: 0, business: 0, premium: 0 });
  const [recommendedTariff, setRecommendedTariff] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const { data: questions, isLoading } = useQuery<QuizQuestion[]>({
    queryKey: ['quizQuestions'],
    queryFn: fetchQuizQuestions,
  });

  useEffect(() => {
    if (questions && questions.length > 0 && activeStep < questions.length) {
      const currentQuestion = questions[activeStep];
      if (answers[currentQuestion.id] === undefined) {
        // Reset scores if moving back to an unanswered question
      }
    }
  }, [activeStep, questions, answers]);

  const handleAnswer = (questionId: number, option: QuizOption) => {
    const newAnswers = { ...answers, [questionId]: option.id };
    setAnswers(newAnswers);

    // Calculate scores based on all current answers
    const newScores = { start: 0, business: 0, premium: 0 };
    questions?.forEach(q => {
      const selectedOptionId = newAnswers[q.id];
      if (selectedOptionId) {
        const selectedOption = q.options.find(o => o.id === selectedOptionId);
        if (selectedOption) {
          newScores.start += selectedOption.pointsStart;
          newScores.business += selectedOption.pointsBusiness;
          newScores.premium += selectedOption.pointsPremium;
        }
      }
    });
    setScores(newScores);
  };

  const handleNext = () => {
    if (!questions) return;

    if (activeStep < questions.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // Determine recommended tariff
      const recommended = Object.keys(scores).reduce((a, b) =>
        scores[a] > scores[b] ? a : b
      );
      setRecommendedTariff(recommended);
      if (showEmailDialog) {
        setEmailDialogOpen(true);
      } else if (onComplete) {
        onComplete(recommended);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(Math.max(0, activeStep - 1));
  };

  const handleSubmitResult = async () => {
    if (!recommendedTariff) return;
    try {
      await submitQuizResult(recommendedTariff, answers, userEmail || undefined);
      setEmailDialogOpen(false);
      if (onComplete) {
        onComplete(recommendedTariff);
      }
    } catch (error) {
      console.error('Error submitting quiz result:', error);
      setEmailDialogOpen(false);
      if (onComplete) {
        onComplete(recommendedTariff);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography>Загрузка вопросов...</Typography>
      </Box>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Вопросы квиза не найдены</Typography>
      </Box>
    );
  }

  const currentQuestion = questions[activeStep];
  const isLastStep = activeStep === questions.length - 1;
  const canProceed = answers[currentQuestion.id] !== undefined;

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
        Какой тариф вам подходит?
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Ответьте на несколько вопросов, и мы подберем оптимальный тариф
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {questions.map((q, index) => (
          <Step key={q.id}>
            <StepLabel>{index + 1}</StepLabel>
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
              Вопрос {activeStep + 1} из {questions.length}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => {
                  const option = currentQuestion.options.find((o) => o.id === Number(e.target.value));
                  if (option) {
                    handleAnswer(currentQuestion.id, option);
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
                      handleAnswer(currentQuestion.id, option);
                    }}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={option.id}
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
                      />
                    </CardContent>
                  </MotionCard>
                ))}
              </RadioGroup>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button disabled={activeStep === 0} onClick={handleBack} startIcon={<ArrowBack />}>
                Назад
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canProceed}
                endIcon={isLastStep ? <CheckCircle /> : <ArrowForward />}
              >
                {isLastStep ? 'Завершить квиз' : 'Далее'}
              </Button>
            </Box>
          </motion.div>
        </AnimatePresence>
      </MotionPaper>

      {showEmailDialog && (
        <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)}>
          <DialogTitle>Получите персональное предложение!</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Оставьте свой email, и мы отправим вам подробное коммерческое предложение,
              основанное на ваших ответах и рекомендованном тарифе "{tariffNames[recommendedTariff || 'start']}".
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmailDialogOpen(false)}>Пропустить</Button>
            <Button onClick={handleSubmitResult} variant="contained">
              Отправить
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

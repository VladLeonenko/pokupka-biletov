import { useState } from 'react';
import { Box, Typography, Button, Stepper, Step, StepLabel, Paper, RadioGroup, FormControlLabel, Radio, FormControl, Card, CardContent } from '@mui/material';
import { CheckCircle, ArrowForward, ArrowBack } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionPaper = motion.create(Paper);
const MotionCard = motion.create(Card);

interface QuizQuestion {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    description?: string;
    points: Record<string, number>; // Тариф -> очки
  }[];
}

interface TariffQuizProps {
  onComplete: (recommendedTariff: string) => void;
}

const questions: QuizQuestion[] = [
  {
    id: 'budget',
    question: 'Какой у вас бюджет на проект?',
    options: [
      { value: 'low', label: 'До 500 000 ₽', points: { start: 3, business: 1, premium: 0 } },
      { value: 'medium', label: '500 000 - 1 500 000 ₽', points: { start: 1, business: 3, premium: 1 } },
      { value: 'high', label: 'Свыше 1 500 000 ₽', points: { start: 0, business: 2, premium: 3 } },
    ],
  },
  {
    id: 'timeline',
    question: 'Какой срок реализации проекта?',
    options: [
      { value: 'fast', label: 'До 1 месяца', points: { start: 3, business: 1, premium: 0 } },
      { value: 'normal', label: '1-3 месяца', points: { start: 1, business: 3, premium: 1 } },
      { value: 'flexible', label: '3+ месяца', points: { start: 0, business: 2, premium: 3 } },
    ],
  },
  {
    id: 'complexity',
    question: 'Какая сложность проекта?',
    options: [
      { value: 'simple', label: 'Простой (базовый функционал)', points: { start: 3, business: 1, premium: 0 } },
      { value: 'medium', label: 'Средний (стандартные функции)', points: { start: 1, business: 3, premium: 1 } },
      { value: 'complex', label: 'Сложный (кастомные решения)', points: { start: 0, business: 1, premium: 3 } },
    ],
  },
  {
    id: 'support',
    question: 'Нужна ли долгосрочная поддержка?',
    options: [
      { value: 'no', label: 'Нет, только запуск', points: { start: 3, business: 1, premium: 0 } },
      { value: 'yes', label: 'Да, нужна поддержка', points: { start: 0, business: 2, premium: 3 } },
    ],
  },
  {
    id: 'scale',
    question: 'Какой масштаб проекта?',
    options: [
      { value: 'small', label: 'Малый бизнес / Стартап', points: { start: 3, business: 1, premium: 0 } },
      { value: 'medium', label: 'Средний бизнес', points: { start: 1, business: 3, premium: 1 } },
      { value: 'large', label: 'Крупная компания', points: { start: 0, business: 1, premium: 3 } },
    ],
  },
];

const tariffNames: Record<string, string> = {
  start: 'START',
  business: 'Малый бизнес',
  premium: 'PPRIME',
};

// Экспортируем для использования в других компонентах
export { tariffNames };

export function TariffQuiz({ onComplete }: TariffQuizProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({ start: 0, business: 0, premium: 0 });

  const handleAnswer = (questionId: string, optionValue: string, points: Record<string, number>) => {
    const newAnswers = { ...answers, [questionId]: optionValue };
    setAnswers(newAnswers);

    // Обновляем очки
    const newScores = { ...scores };
    Object.keys(points).forEach((tariff) => {
      newScores[tariff] = (newScores[tariff] || 0) + points[tariff];
    });
    setScores(newScores);
  };

  const handleNext = () => {
    if (activeStep < questions.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // Определяем рекомендуемый тариф
      const recommended = Object.keys(scores).reduce((a, b) =>
        scores[a] > scores[b] ? a : b
      );
      onComplete(recommended);
    }
  };

  const handleBack = () => {
    setActiveStep(Math.max(0, activeStep - 1));
  };

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
        {questions.map((q) => (
          <Step key={q.id}>
            <StepLabel>{q.question}</StepLabel>
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
              {currentQuestion.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Вопрос {activeStep + 1} из {questions.length}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => {
                  const option = currentQuestion.options.find((o) => o.value === e.target.value);
                  if (option) {
                    handleAnswer(currentQuestion.id, option.value, option.points);
                  }
                }}
              >
                {currentQuestion.options.map((option) => (
                  <MotionCard
                    key={option.value}
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: answers[currentQuestion.id] === option.value ? 2 : 1,
                      borderColor:
                        answers[currentQuestion.id] === option.value ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => {
                      handleAnswer(currentQuestion.id, option.value, option.points);
                    }}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={option.value}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {option.label}
                            </Typography>
                            {option.description && (
                              <Typography variant="caption" color="text.secondary">
                                {option.description}
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
    </Box>
  );
}

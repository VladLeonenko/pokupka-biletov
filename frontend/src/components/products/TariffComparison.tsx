import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { dedupeRepeatedPhrase } from '@/utils/text';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { motion } from 'framer-motion';

const MotionTableContainer = motion.create(TableContainer);

interface Tariff {
  id: string;
  name: string;
  subtitle?: string;
  price: string;
  description?: string;
  featuresLeft?: string[];
  featuresRight?: string[];
}

interface TariffComparisonProps {
  tariffs: Tariff[];
  title?: string;
}

export function TariffComparison({ tariffs, title = 'Сравнение тарифов' }: TariffComparisonProps) {
  if (!tariffs || tariffs.length === 0) return null;

  // Собираем все уникальные фичи из всех тарифов
  const allFeatures = new Set<string>();
  tariffs.forEach((tariff) => {
    tariff.featuresLeft?.forEach((f) => allFeatures.add(f));
    tariff.featuresRight?.forEach((f) => allFeatures.add(f));
  });
  const featuresList = Array.from(allFeatures);

  return (
    <Box sx={{ my: 6 }}>
      <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
        {title}
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Выберите тариф, который лучше всего подходит для вашего проекта
      </Typography>

      <MotionTableContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ overflowX: 'auto' }}
        component={Paper}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 200 }}>
                Функция / Тариф
              </TableCell>
              {tariffs.map((tariff) => (
                <TableCell
                  key={tariff.id}
                  align="center"
                  sx={{ color: 'white', fontWeight: 'bold', minWidth: 180 }}
                >
                  <Box>
                    <Typography variant="h6">{tariff.name}</Typography>
                    {tariff.subtitle && (
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {dedupeRepeatedPhrase(tariff.subtitle)}
                      </Typography>
                    )}
                    <Chip
                      label={tariff.price}
                      sx={{
                        mt: 1,
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontWeight: 'bold',
                      }}
                    />
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {featuresList.map((feature, idx) => (
              <TableRow
                key={feature}
                sx={{
                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                  {feature}
                </TableCell>
                {tariffs.map((tariff) => {
                  const hasFeature =
                    tariff.featuresLeft?.includes(feature) ||
                    tariff.featuresRight?.includes(feature);
                  return (
                    <TableCell key={tariff.id} align="center">
                      {hasFeature ? (
                        <CheckCircle sx={{ color: 'success.main' }} />
                      ) : (
                        <Cancel sx={{ color: 'error.main', opacity: 0.3 }} />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </MotionTableContainer>

      {/* Дополнительная информация о тарифах */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {tariffs.map((tariff) => (
          <Paper
            key={tariff.id}
            sx={{
              p: 2,
              flex: '1 1 300px',
              maxWidth: 400,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" gutterBottom>
              {tariff.name}
            </Typography>
            {tariff.description && (
              <Typography variant="body2" color="text.secondary">
                {tariff.description}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

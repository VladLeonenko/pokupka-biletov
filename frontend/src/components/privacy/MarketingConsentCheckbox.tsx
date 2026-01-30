import { Checkbox, FormControlLabel, Typography } from '@mui/material';

interface MarketingConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function MarketingConsentCheckbox({
  checked,
  onChange,
}: MarketingConsentCheckboxProps) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={
        <Typography variant="body2" color="text.secondary">
          Я согласен получать информационные рассылки и рекламные материалы
          <Typography component="span" variant="caption" sx={{ ml: 0.5, display: 'block' }}>
            (необязательно)
          </Typography>
        </Typography>
      }
    />
  );
}


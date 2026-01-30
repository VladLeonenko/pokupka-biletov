import { Checkbox, FormControlLabel, Typography, Link } from '@mui/material';

interface PrivacyConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  required?: boolean;
}

export function PrivacyConsentCheckbox({
  checked,
  onChange,
  error,
  required = true,
}: PrivacyConsentCheckboxProps) {
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            required={required}
          />
        }
        label={
          <Typography variant="body2">
            Я согласен на{' '}
            <Link href="/politic" target="_blank" sx={{ textDecoration: 'underline' }}>
              обработку персональных данных
            </Link>
            {required && ' *'}
          </Typography>
        }
      />
      {error && (
        <Typography variant="caption" color="error" sx={{ ml: 4, display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </>
  );
}


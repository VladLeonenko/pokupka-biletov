-- Дополнительное поле для временной блокировки подписок AI Team
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_team_subscriptions' AND column_name = 'paused_until'
  ) THEN
    ALTER TABLE ai_team_subscriptions
      ADD COLUMN paused_until TIMESTAMPTZ;
  END IF;
END $$;







-- Ручные офферы (VIP / доп. места) поверх GetBilet: массив ResultData-подобных объектов.
ALTER TABLE getbilet_events
  ADD COLUMN IF NOT EXISTS manual_offers_json JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN getbilet_events.manual_offers_json IS
  'Ручные офферы (VIP и т.п.): [{Sector,Row,SeatList,SupplierPrice,AgentPrice,NominalPrice,EventDateTime,...}]. Мержатся в GetOfferList.';

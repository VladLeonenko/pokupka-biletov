-- Payments (платежи)
CREATE TABLE IF NOT EXISTS deal_payments (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  due_date DATE NOT NULL, -- Срок оплаты
  paid_date DATE, -- Дата фактической оплаты
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  description TEXT,
  reminder_sent_at TIMESTAMP, -- Когда было отправлено напоминание
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deal Documents (документы сделок: договоры, счета и т.д.)
CREATE TABLE IF NOT EXISTS deal_documents (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Путь к файлу в /uploads/documents
  file_size INTEGER, -- Размер файла в байтах
  mime_type VARCHAR(100),
  document_type VARCHAR(50), -- contract, invoice, agreement, other
  description TEXT,
  uploaded_by INTEGER, -- user_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (уведомления)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- Для кого уведомление (0 = для всех)
  type VARCHAR(50) NOT NULL, -- payment_due, payment_overdue, deal_assigned, document_uploaded, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link_url VARCHAR(500), -- Ссылка на связанный объект (например, /admin/funnels/1)
  related_entity_type VARCHAR(50), -- deal, payment, document
  related_entity_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal_id ON deal_payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_payments_due_date ON deal_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_deal_payments_status ON deal_payments(status);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);




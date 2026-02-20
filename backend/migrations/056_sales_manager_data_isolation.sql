-- Изоляция данных менеджеров по продажам: каждый видит только своих клиентов/подписчиков
-- Админ видит всё. assigned_to/managed_by = null означает "только админ" (или не назначено)

-- Клиенты: назначаемый менеджер
ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON clients(assigned_to);
COMMENT ON COLUMN clients.assigned_to IS 'Менеджер по продажам, ответственный за клиента. NULL = видно только админу.';

-- Подписчики email: кто добавил/импортировал
ALTER TABLE email_subscribers ADD COLUMN IF NOT EXISTS managed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_subscribers_managed_by ON email_subscribers(managed_by);
COMMENT ON COLUMN email_subscribers.managed_by IS 'Менеджер, добавивший подписчика. NULL = только админ.';

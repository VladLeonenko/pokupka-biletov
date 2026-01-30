-- Скрипт для ручного создания БД (выполни от пользователя с правами CREATEDB)
-- Использование: psql -h localhost -U postgres -f create-databases-manually.sql

-- Создаём БД для каждого проекта
CREATE DATABASE primecoder_db OWNER primeuser;
CREATE DATABASE amani_db OWNER primeuser;
CREATE DATABASE umagazine_db OWNER primeuser;

-- Или дай права пользователю primeuser на создание БД:
-- ALTER USER primeuser CREATEDB;

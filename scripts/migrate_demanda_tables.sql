-- ============================================================
-- Migración: Módulo de Demanda Pronóstico
-- Tablas: SphaerAI_monthly_demand, SphaerAI_yearly_demand, SphaerAI_type_year,
--         SphaerAI_users_models, SphaerAI_users_models_values
-- ============================================================

-- ─── SphaerAI_monthly_demand ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_monthly_demand" (
    id           SERIAL PRIMARY KEY,
    year         INTEGER NOT NULL,
    month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    value        FLOAT   NOT NULL DEFAULT 0,
    percentage   FLOAT   NOT NULL DEFAULT 0,
    climate_type VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                 CHECK (climate_type IN ('NORMAL', 'NIÑO', 'NIÑA')),
    UNIQUE (year, month)
);

-- ─── SphaerAI_yearly_demand ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_yearly_demand" (
    id     SERIAL PRIMARY KEY,
    year   INTEGER NOT NULL UNIQUE,
    demand FLOAT   NOT NULL DEFAULT 0
);

-- ─── SphaerAI_type_year ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_type_year" (
    id         SERIAL PRIMARY KEY,
    year       INTEGER      NOT NULL,
    type       VARCHAR(10)  NOT NULL DEFAULT 'TIPICO'
               CHECK (type IN ('TIPICO', 'ATIPICO')),
    user_id    INTEGER      NOT NULL,
    session_id INTEGER      NOT NULL,
    UNIQUE (year, user_id, session_id)
);

-- ─── SphaerAI_users_models ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_users_models" (
    id         SERIAL PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    user_id    INTEGER      NOT NULL,
    session_id INTEGER      NOT NULL,
    start_date DATE         NOT NULL,
    end_date   DATE         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── SphaerAI_users_models_values ────────────────────────────────
CREATE TABLE IF NOT EXISTS "SphaerAI_users_models_values" (
    id           SERIAL PRIMARY KEY,
    model_id     INTEGER     NOT NULL REFERENCES "SphaerAI_users_models"(id) ON DELETE CASCADE,
    date         DATE        NOT NULL,
    value        FLOAT       NOT NULL DEFAULT 0,
    climate_type VARCHAR(10) NOT NULL DEFAULT 'NORMAL'
                 CHECK (climate_type IN ('NORMAL', 'NIÑO', 'NIÑA')),
    UNIQUE (model_id, date)
);

-- ─── Índices de desempeño ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sphaer_monthly_demand_year
    ON "SphaerAI_monthly_demand" (year);

CREATE INDEX IF NOT EXISTS idx_sphaer_type_year_user_session
    ON "SphaerAI_type_year" (user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_user_session
    ON "SphaerAI_users_models" (user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_values_model
    ON "SphaerAI_users_models_values" (model_id);

CREATE INDEX IF NOT EXISTS idx_sphaer_users_models_values_date
    ON "SphaerAI_users_models_values" (model_id, date);

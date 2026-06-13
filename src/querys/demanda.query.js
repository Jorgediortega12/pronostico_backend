// ─── Monthly Demand ────────────────────────────────────────────────────────────
export const getMonthlyDemand = `
  SELECT year, month, value, percentage, climate_type
  FROM "SphaerAI_monthly_demand"
  ORDER BY year, month
`;

export const getMonthlyDemandByYear = `
  SELECT year, month, value, percentage, climate_type
  FROM "SphaerAI_monthly_demand"
  WHERE year = $1
  ORDER BY month
`;

export const updateMonthlyClimateType = `
  UPDATE "SphaerAI_monthly_demand"
  SET climate_type = $1
  WHERE year = $2 AND month = $3
`;

export const getMonthlyDemandBeforeDate = `
  SELECT value, year, month
  FROM "SphaerAI_monthly_demand"
  WHERE (year < $1) OR (year = $1 AND month < $2)
  ORDER BY year, month
`;

export const getMonthlyStats = `
  SELECT
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    AVG(value) AS avg_value
  FROM "SphaerAI_monthly_demand"
  WHERE year = $1 AND month = $2
`;

export const getMonthlyValueForMonth = `
  SELECT value FROM "SphaerAI_monthly_demand" WHERE year = $1 AND month = $2
`;

// ─── Yearly Demand ─────────────────────────────────────────────────────────────
export const getYearlyDemands = `
  SELECT year, demand
  FROM "SphaerAI_yearly_demand"
  ORDER BY year
`;

export const getLastDateFromDemands = `
  SELECT
    MIN(fecha)::date AS first_date,
    MAX(fecha)::date AS last_date
  FROM "PRONOSTICO_demands"
  WHERE file_type = 'txf'
`;

export const getHistoricYears = `
  SELECT DISTINCT EXTRACT(YEAR FROM fecha)::int AS year
  FROM "PRONOSTICO_demands"
  WHERE EXTRACT(MONTH FROM fecha) = 12 AND EXTRACT(DAY FROM fecha) = 31
  ORDER BY year
`;

// ─── Type Year ─────────────────────────────────────────────────────────────────
export const insertTypeYear = `
  INSERT INTO "SphaerAI_type_year" (year, type, user_id, session_id)
  VALUES ($1, $2, $3, $4)
`;

export const updateTypeYear = `
  UPDATE "SphaerAI_type_year"
  SET type = $1
  WHERE year = $2 AND user_id = $3 AND session_id = $4
`;

export const getTypeYearList = `
  SELECT year, type
  FROM "SphaerAI_type_year"
  WHERE user_id = $1 AND session_id = $2
  ORDER BY year
`;

export const getAllYearsFromYearlyDemand = `
  SELECT year FROM "SphaerAI_yearly_demand" ORDER BY year
`;

// ─── Users Models ──────────────────────────────────────────────────────────────
export const createUserModel = `
  INSERT INTO "SphaerAI_users_models" (model_name, user_id, session_id, start_date, end_date, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
  RETURNING id
`;

export const getUserModels = `
  SELECT id, model_name, start_date, end_date
  FROM "SphaerAI_users_models"
  WHERE user_id = $1 AND session_id = $2
  ORDER BY id
`;

export const getAllModels = `
  SELECT id, model_name, user_id, session_id, start_date, end_date
  FROM "SphaerAI_users_models"
  ORDER BY id
`;

export const getUserModelById = `
  SELECT id, model_name, start_date, end_date
  FROM "SphaerAI_users_models"
  WHERE id = $1
`;

// ─── Users Models Values ───────────────────────────────────────────────────────
export const deleteModelValues = `
  DELETE FROM "SphaerAI_users_models_values" WHERE model_id = $1
`;

export const insertModelValue = `
  INSERT INTO "SphaerAI_users_models_values" (model_id, date, value, climate_type)
  VALUES ($1, $2, $3, $4)
`;

export const getModelValues = `
  SELECT date, value, climate_type
  FROM "SphaerAI_users_models_values"
  WHERE model_id = $1
  ORDER BY date
`;

export const getModelValuesByYear = `
  SELECT date, value, climate_type
  FROM "SphaerAI_users_models_values"
  WHERE model_id = $1 AND EXTRACT(YEAR FROM date) = $2
  ORDER BY date
`;

export const updateModelValueClimateAndValue = `
  UPDATE "SphaerAI_users_models_values"
  SET value = $1, climate_type = $2
  WHERE model_id = $3 AND date = $4
`;

export const checkModelExists = `
  SELECT id FROM "SphaerAI_users_models_values" WHERE model_id = $1 LIMIT 1
`;
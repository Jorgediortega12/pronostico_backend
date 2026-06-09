CREATE SEQUENCE IF NOT EXISTS pro_demands_id_seq;

CREATE TABLE IF NOT EXISTS "PRONOSTICO_demands" (
    id          INTEGER PRIMARY KEY DEFAULT nextval('pro_demands_id_seq'),
    hora_1      FLOAT,
    hora_2      FLOAT,
    hora_3      FLOAT,
    hora_4      FLOAT,
    hora_5      FLOAT,
    hora_6      FLOAT,
    hora_7      FLOAT,
    hora_8      FLOAT,
    hora_9      FLOAT,
    hora_10     FLOAT,
    hora_11     FLOAT,
    hora_12     FLOAT,
    hora_13     FLOAT,
    hora_14     FLOAT,
    hora_15     FLOAT,
    hora_16     FLOAT,
    hora_17     FLOAT,
    hora_18     FLOAT,
    hora_19     FLOAT,
    hora_20     FLOAT,
    hora_21     FLOAT,
    hora_22     FLOAT,
    hora_23     FLOAT,
    hora_24     FLOAT,
    total       FLOAT,
    fecha       TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_fecha  VARCHAR(1) DEFAULT '0' CHECK (tipo_fecha IN ('0', '1', '2')),
    file_type   VARCHAR(3) DEFAULT 'txf'
);

CREATE SEQUENCE IF NOT EXISTS pro_macroeconomics_id_seq;

CREATE TABLE IF NOT EXISTS "PRONOSTICO_macroeconomics" (
    id      INTEGER PRIMARY KEY DEFAULT nextval('pro_macroeconomics_id_seq'),
    name    VARCHAR(250)
);

CREATE SEQUENCE IF NOT EXISTS pro_macroeconomics_data_id_seq;

CREATE TABLE IF NOT EXISTS "PRONOSTICO_macroeconomics_data" (
    id      INTEGER PRIMARY KEY DEFAULT nextval('pro_macroeconomics_data_id_seq'),
    ano     INTEGER,
    eco_id  INTEGER REFERENCES "PRONOSTICO_macroeconomics"(id),
    value   FLOAT
);

CREATE SEQUENCE IF NOT EXISTS pro_climates_id_seq;

CREATE TABLE IF NOT EXISTS "PRONOSTICO_climates" (
    id      INTEGER PRIMARY KEY DEFAULT nextval('pro_climates_id_seq'),
  
    t1  FLOAT, t2  FLOAT, t3  FLOAT, t4  FLOAT, t5  FLOAT, t6  FLOAT,
    t7  FLOAT, t8  FLOAT, t9  FLOAT, t10 FLOAT, t11 FLOAT, t12 FLOAT,
    t13 FLOAT, t14 FLOAT, t15 FLOAT, t16 FLOAT, t17 FLOAT, t18 FLOAT,
    t19 FLOAT, t20 FLOAT, t21 FLOAT, t22 FLOAT, t23 FLOAT, t24 FLOAT,
  
    h1  FLOAT, h2  FLOAT, h3  FLOAT, h4  FLOAT, h5  FLOAT, h6  FLOAT,
    h7  FLOAT, h8  FLOAT, h9  FLOAT, h10 FLOAT, h11 FLOAT, h12 FLOAT,
    h13 FLOAT, h14 FLOAT, h15 FLOAT, h16 FLOAT, h17 FLOAT, h18 FLOAT,
    h19 FLOAT, h20 FLOAT, h21 FLOAT, h22 FLOAT, h23 FLOAT, h24 FLOAT,
  
    v1  FLOAT, v2  FLOAT, v3  FLOAT, v4  FLOAT, v5  FLOAT, v6  FLOAT,
    v7  FLOAT, v8  FLOAT, v9  FLOAT, v10 FLOAT, v11 FLOAT, v12 FLOAT,
    v13 FLOAT, v14 FLOAT, v15 FLOAT, v16 FLOAT, v17 FLOAT, v18 FLOAT,
    v19 FLOAT, v20 FLOAT, v21 FLOAT, v22 FLOAT, v23 FLOAT, v24 FLOAT,
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

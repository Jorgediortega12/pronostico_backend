export const asegurarColumnaTipoDia = `
ALTER TABLE fact_dna ADD COLUMN IF NOT EXISTS tipo_dia VARCHAR(20) NOT NULL DEFAULT 'ORDINARIO';
ALTER TABLE fact_dna DROP CONSTRAINT IF EXISTS fact_dna_ucp_key;
`;

export const asegurarIndiceUnicoFactDna = `
CREATE UNIQUE INDEX IF NOT EXISTS fact_dna_ucp_tipo_dia_idx ON fact_dna (ucp, tipo_dia)
`;

export const upsertFactDna = `
INSERT INTO fact_dna (ucp, tipo_dia, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
  p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
  updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26, NOW())
ON CONFLICT (ucp, tipo_dia) DO UPDATE SET
  p1=$3, p2=$4, p3=$5, p4=$6, p5=$7, p6=$8, p7=$9, p8=$10, p9=$11, p10=$12,
  p11=$13, p12=$14, p13=$15, p14=$16, p15=$17, p16=$18, p17=$19, p18=$20,
  p19=$21, p20=$22, p21=$23, p22=$24, p23=$25, p24=$26, updated_at=NOW()
RETURNING *
`;

export const getFactDna = `
SELECT * FROM fact_dna WHERE ucp = $1 AND tipo_dia = $2
`;

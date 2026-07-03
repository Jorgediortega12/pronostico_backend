export const upsertFactDna = `
INSERT INTO fact_dna (ucp, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
  p11, p12, p13, p14, p15, p16, p17, p18, p19, p20, p21, p22, p23, p24,
  updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25, NOW())
ON CONFLICT (ucp) DO UPDATE SET
  p1=$2, p2=$3, p3=$4, p4=$5, p5=$6, p6=$7, p7=$8, p8=$9, p9=$10, p10=$11,
  p11=$12, p12=$13, p13=$14, p14=$15, p15=$16, p16=$17, p17=$18, p18=$19,
  p19=$20, p20=$21, p21=$22, p22=$23, p23=$24, p24=$25, updated_at=NOW()
RETURNING *
`;

export const getFactDna = `
SELECT * FROM fact_dna WHERE ucp = $1
`;

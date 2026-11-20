#!/usr/bin/env bash
# Humo BE5 (manual, tras la fase E5 de EPM): preview con perfil="jamer" contra EPM local.
# Uso: EPM_AJUSTES_URL=http://127.0.0.1:8001 AJUSTES_SERVICE_TOKEN=... ./tests/humo_epm.sh [UCP] [LUNES]
# Con el intermedio levantado y un JWT de Sphere (SPHERE_URL y SPHERE_JWT definidos) prueba también el proxy.
# SIN base_curvas, EPM refresca datos (full_update_csv reescribe data/raw) y llama al modelo: para un humo sin
# efectos, define BASE_CURVAS_FILE=<json {fecha:[24]} que cubra corte+1..domingo> (EPM con histórico de prueba).
# No imprime el token; solo muestra si `nivel.diagnostics.referencias` llegó.
set -euo pipefail
EPM="${EPM_AJUSTES_URL:-http://127.0.0.1:8001}"
UCP="${1:-Antioquia}"
LUNES="${2:-2026-11-23}"
if [[ -n "${BASE_CURVAS_FILE:-}" ]]; then
  CUERPO=$(python3 -c 'import sys,json; print(json.dumps({"ucp":sys.argv[1],"semana_inicio":sys.argv[2],"perfil":"jamer","base_curvas":json.load(open(sys.argv[3]))}))' "$UCP" "$LUNES" "$BASE_CURVAS_FILE")
else
  echo "AVISO: sin BASE_CURVAS_FILE, EPM refrescará datos y llamará al modelo (efectos sobre data/raw)." >&2
  CUERPO=$(printf '{"ucp":"%s","semana_inicio":"%s","perfil":"jamer"}' "$UCP" "$LUNES")
fi
H=(-H "Content-Type: application/json")
[[ -n "${AJUSTES_SERVICE_TOKEN:-}" ]] && H+=(-H "X-Ajustes-Token: ${AJUSTES_SERVICE_TOKEN}")

echo "== EPM directo: POST /adjustments/preview perfil=jamer"
curl -sS -m 200 "${H[@]}" -d "$CUERPO" "$EPM/adjustments/preview" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); n=[s for s in d.get("steps",[]) if s["paso"]=="nivel"]; print("nivel.referencias:", bool(n and n[0]["diagnostics"].get("referencias")))'

if [[ -n "${SPHERE_URL:-}" && -n "${SPHERE_JWT:-}" ]]; then
  echo "== Intermedio: POST ${SPHERE_URL}/admin/dashboard/ajustes/preview"
  curl -sS -m 200 -H "Authorization: Bearer ${SPHERE_JWT}" -H "Content-Type: application/json" -d "$CUERPO" \
    "${SPHERE_URL}/admin/dashboard/ajustes/preview" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); print("success:", d.get("success")); n=[s for s in d.get("data",{}).get("steps",[]) if s["paso"]=="nivel"]; print("nivel.referencias:", bool(n and n[0]["diagnostics"].get("referencias")))'
fi

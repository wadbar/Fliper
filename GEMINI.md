# GEMINI.md - DIRETRIZES DE AI ENGINE V9

## CONFIGURAÇÃO DE MODELO
- **Modelo Principal**: `gemini-flash-latest` (via NeuralCore Relay).
- **Provedor**: `/src/services/ai/providers/gemini.mjs` (Fetch Nativo V9 com Retry/Backoff).

## REGRAS DE RESILIÊNCIA V9
1. **Backoff Industrial**: Retentativas com delay exponencial `(2^attempt+2 * 1000ms)` para erros 429/5xx.
2. **Circuit Breaker Penalizado**: Erros 429 custam +3 no contador de falhas para isolamento rápido de nodes saturados.
3. **Telemetry SSE**: Sincronização via `/api/ai/telemetry` (3s resolution).
4. **Fallback de Hibernação**: Ativação automática de nodes `HIBERNATED` apenas em falha total de Camadas 1 e 2.

## SEGURANÇA E TELEMETRIA
- API Keys mascaradas em logs e Telemetry UI.
- Monitoramento em tempo real de latência e saúde de providers.

# Edge Functions

## Deploy

```bash
supabase functions deploy create-checkout
supabase functions deploy asaas-webhook
supabase functions deploy check-alunos-limit
supabase functions deploy invite-aluno
```

## Secrets

```bash
supabase secrets set ASAAS_API_KEY=sua_chave
supabase secrets set ASAAS_WEBHOOK_TOKEN=seu_token
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_key
```

> `SUPABASE_URL` é injetado automaticamente pelo runtime, não precisa setar.

## Webhook URL (cadastrar no Asaas)

```
https://<project-ref>.supabase.co/functions/v1/asaas-webhook
```

Cadastre o mesmo valor de `ASAAS_WEBHOOK_TOKEN` no campo "Token de autenticação"
da configuração do webhook no Asaas (Conta → Integrações → Webhooks).

## Testar localmente

```bash
supabase functions serve --env-file ./supabase/.env.local
```

Em outro terminal:

```bash
# create-checkout (precisa de JWT de um professor)
curl -X POST http://localhost:54321/functions/v1/create-checkout \
  -H "Authorization: Bearer <JWT_DO_PROFESSOR>" \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"<UUID_DA_ACADEMIA>","plano_id":"grow"}'

# check-alunos-limit
curl -X POST http://localhost:54321/functions/v1/check-alunos-limit \
  -H "Authorization: Bearer <JWT_DO_PROFESSOR>" \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"<UUID_DA_ACADEMIA>"}'

# asaas-webhook (simulado)
curl -X POST http://localhost:54321/functions/v1/asaas-webhook \
  -H "asaas-access-token: <ASAAS_WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_CONFIRMED","payment":{"subscription":"sub_xxx","paymentDate":"2026-06-09"}}'

# invite-aluno (precisa de JWT de um professor)
curl -X POST http://localhost:54321/functions/v1/invite-aluno \
  -H "Authorization: Bearer <JWT_DO_PROFESSOR>" \
  -H "Content-Type: application/json" \
  -d '{"gym_id":"<UUID>","nome":"João","email":"joao@exemplo.com"}'
```

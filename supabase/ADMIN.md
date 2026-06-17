# Operações de Admin

## Aplicar plano customizado

No Supabase Dashboard → Table Editor → `gym_subscriptions`:

- `plano_customizado`: `true`
- `alunos_limite_custom`: número (ex: `50`)
- `observacao_admin`: texto (ex: `"amigo - combo R$ 29/mês"`)
- `status`: `'ativo'`

Quando `plano_customizado = true`, `check-alunos-limit` usa `alunos_limite_custom`
como teto efetivo em vez do `alunos_limite` do plano contratado.

## Remover plano customizado

- `plano_customizado`: `false`
- `alunos_limite_custom`: `null`

A academia volta a seguir o `alunos_limite` do plano vigente.

## Ver todas as academias com plano customizado

```sql
select g.nome,
       gs.plano,
       gs.alunos_limite_custom,
       gs.status,
       gs.observacao_admin
from gym_subscriptions gs
join gyms g on g.id = gs.gym_id
where gs.plano_customizado = true;
```

## Renovar manualmente uma assinatura (suporte)

```sql
update gym_subscriptions
set status = 'ativo',
    vence_em = now() + interval '30 days',
    atualizado_em = now()
where gym_id = '<UUID_DA_ACADEMIA>';
```

## Estender trial

```sql
update gym_subscriptions
set vence_em = now() + interval '15 days',
    atualizado_em = now()
where gym_id = '<UUID_DA_ACADEMIA>'
  and status = 'trial';
```

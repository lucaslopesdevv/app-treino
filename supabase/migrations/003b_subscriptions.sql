-- ============================================================
-- Fase 3F (1/2) — Multi-tenant + Assinaturas
-- ============================================================

-- ----- Prereq: tabela gyms (não existia ainda no schema base) -----
create table if not exists gyms (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text,
  created_at  timestamptz default now()
);

-- Garante FK profiles.gym_id → gyms.id (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gym_id_fkey'
  ) then
    alter table profiles
      add constraint profiles_gym_id_fkey
      foreign key (gym_id) references gyms(id) on delete set null;
  end if;
end$$;

-- ----- Assinaturas por academia -----
create table if not exists gym_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  gym_id                uuid references gyms(id) on delete cascade not null unique,
  plano                 text not null default 'starter',
  alunos_limite         int  not null default 30,
  status                text check (status in ('trial','ativo','vencido','cancelado')) not null default 'trial',
  asaas_customer_id     text,
  asaas_subscription_id text,
  vence_em              timestamptz,
  -- Plano customizado pelo admin (overrides de cortesia/parceria)
  plano_customizado     boolean default false,
  alunos_limite_custom  int,
  observacao_admin      text,
  criado_em             timestamptz default now(),
  atualizado_em         timestamptz default now()
);

-- Trial automático ao criar uma academia
create or replace function create_trial_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into gym_subscriptions (gym_id, plano, alunos_limite, status)
  values (new.id, 'starter', 30, 'trial')
  on conflict (gym_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_gym_created on gyms;
create trigger on_gym_created
  after insert on gyms
  for each row execute procedure create_trial_subscription();

-- ----- RLS -----
alter table gyms enable row level security;
alter table gym_subscriptions enable row level security;

drop policy if exists "Membros veem a própria academia" on gyms;
create policy "Membros veem a própria academia"
on gyms for select
using (
  id = (select gym_id from profiles where id = auth.uid())
);

drop policy if exists "Professor vê assinatura da própria academia" on gym_subscriptions;
create policy "Professor vê assinatura da própria academia"
on gym_subscriptions for select
using (gym_id = (select gym_id from profiles where id = auth.uid()));

-- ----- View: alunos ativos nos últimos 30 dias por academia -----
create or replace view vw_alunos_ativos as
select
  p.gym_id,
  count(distinct p.id) as total
from profiles p
where p.role = 'aluno'
  and p.gym_id is not null
  and exists (
    select 1 from workout_logs wl
    where wl.aluno_id = p.id
      and wl.created_at > now() - interval '30 days'
  )
group by p.gym_id;

-- ----- Índices -----
create index if not exists idx_workout_logs_created_at
  on workout_logs (aluno_id, created_at desc);

create index if not exists idx_profiles_gym_role
  on profiles (gym_id, role);

create index if not exists idx_gym_subscriptions_asaas_sub
  on gym_subscriptions (asaas_subscription_id);

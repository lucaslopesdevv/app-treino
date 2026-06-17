-- ============================================================
-- Fase 2: índice + view de recordes pessoais
-- ============================================================

-- Índice para consultas de evolução por aluno/exercício
create index if not exists idx_workout_logs_aluno_exercise
  on workout_logs (aluno_id, workout_item_id, data desc);

-- Garante upsert por nome no script de importação
create unique index if not exists exercises_nome_unique on exercises (nome);

-- View de recorde por exercício por aluno
create or replace view vw_personal_records as
select
  wl.aluno_id,
  wi.exercise_id,
  e.nome as exercise_nome,
  max(wl.carga_real) as carga_maxima,
  max(wl.data)       as ultima_vez
from workout_logs wl
join workout_items wi on wi.id = wl.workout_item_id
join exercises e on e.id = wi.exercise_id
where wl.feito = true
  and wl.carga_real is not null
group by wl.aluno_id, wi.exercise_id, e.nome;

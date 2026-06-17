-- ============================================================
-- Seed de dados para teste — Fase 1
-- ============================================================
-- Antes de rodar:
-- 1. Tenha pelo menos um usuário com role='professor' em profiles
--    (no Dashboard: Authentication → Add User com Auto Confirm,
--     depois trocar profiles.role para 'professor').
-- 2. Cole tudo no SQL Editor e execute.
-- ============================================================

-- 1) Exercícios básicos (globais, gym_id NULL)
insert into exercises (nome, grupo_muscular) values
  ('Supino reto',     'Peito'),
  ('Agachamento livre','Pernas'),
  ('Rosca direta',    'Bíceps'),
  ('Leg press 45°',   'Pernas'),
  ('Puxada frente',   'Costas')
on conflict do nothing;

-- 2) Modelo de treino + items (dias A e B)
do $$
declare
  v_professor uuid;
  v_template  uuid;
  v_supino    uuid;
  v_agacha    uuid;
  v_rosca     uuid;
  v_leg       uuid;
  v_puxada    uuid;
begin
  select id into v_professor from profiles where role = 'professor' limit 1;
  if v_professor is null then
    raise notice 'Nenhum professor encontrado — pulando criação do modelo.';
    return;
  end if;

  select id into v_supino from exercises where nome = 'Supino reto'        limit 1;
  select id into v_agacha from exercises where nome = 'Agachamento livre'  limit 1;
  select id into v_rosca  from exercises where nome = 'Rosca direta'       limit 1;
  select id into v_leg    from exercises where nome = 'Leg press 45°'      limit 1;
  select id into v_puxada from exercises where nome = 'Puxada frente'      limit 1;

  insert into workout_templates (professor_id, nome, descricao)
  values (v_professor, 'Hipertrofia AB', 'Modelo exemplo: peito/bíceps no A, pernas/costas no B')
  returning id into v_template;

  -- Dia A: Peito + Bíceps
  insert into template_items (template_id, exercise_id, dia, ordem, series, reps, carga_sugerida, descanso_seg) values
    (v_template, v_supino,  'A', 1, 4, '8-12', 40, 90),
    (v_template, v_puxada,  'A', 2, 4, '10',   45, 75),
    (v_template, v_rosca,   'A', 3, 3, '12',   12, 60);

  -- Dia B: Pernas
  insert into template_items (template_id, exercise_id, dia, ordem, series, reps, carga_sugerida, descanso_seg) values
    (v_template, v_agacha,  'B', 1, 4, '8-10', 60, 120),
    (v_template, v_leg,     'B', 2, 4, '12',   100, 90);
end $$;

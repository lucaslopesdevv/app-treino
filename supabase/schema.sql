-- ============================================================
-- FitFlow / app-treino — schema + RLS
-- Cole no SQL Editor do Supabase e execute.
-- ============================================================

-- ============ TABELAS ============
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  role text check (role in ('professor','aluno')) not null default 'aluno',
  gym_id uuid,
  created_at timestamptz default now()
);

create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  grupo_muscular text,
  gif_url text,
  gym_id uuid,
  created_at timestamptz default now()
);

create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references profiles(id) on delete cascade not null,
  nome text not null,
  descricao text,
  created_at timestamptz default now()
);

create table if not exists template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  dia text check (dia in ('A','B','C','D','E')) not null,
  ordem int not null,
  series int not null,
  reps text not null,
  carga_sugerida numeric,
  descanso_seg int,
  created_at timestamptz default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid references profiles(id) on delete cascade not null,
  professor_id uuid references profiles(id) not null,
  nome text not null,
  origem_template_id uuid references workout_templates(id),
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade not null,
  exercise_id uuid references exercises(id) not null,
  dia text check (dia in ('A','B','C','D','E')) not null,
  ordem int not null,
  series int not null,
  reps text not null,
  carga numeric,
  descanso_seg int,
  created_at timestamptz default now()
);

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  workout_item_id uuid references workout_items(id) on delete cascade not null,
  aluno_id uuid references profiles(id) on delete cascade not null,
  data date default current_date,
  carga_real numeric,
  reps_real int,
  feito boolean default false,
  created_at timestamptz default now()
);

-- ============ TRIGGER: cria profile no signup ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'aluno'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ HELPERS (evitam recursão em RLS) ============
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_gym()
returns uuid language sql stable security definer set search_path = public as $$
  select gym_id from profiles where id = auth.uid()
$$;

-- ============ RLS ============
alter table profiles          enable row level security;
alter table exercises         enable row level security;
alter table workout_templates enable row level security;
alter table template_items    enable row level security;
alter table workouts          enable row level security;
alter table workout_items     enable row level security;
alter table workout_logs      enable row level security;

-- profiles: cada um lê/edita o próprio; professor enxerga alunos da mesma academia
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (public.current_role() = 'professor'
      and gym_id is not distinct from public.current_gym())
);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- exercises: qualquer autenticado lê; professor cria/edita
drop policy if exists exercises_select on exercises;
create policy exercises_select on exercises for select using (auth.role() = 'authenticated');

drop policy if exists exercises_write on exercises;
create policy exercises_write on exercises for all
  using (
    public.current_role() = 'professor'
    and (gym_id is null or gym_id is not distinct from public.current_gym())
  )
  with check (
    public.current_role() = 'professor'
    and (gym_id is null or gym_id is not distinct from public.current_gym())
  );

-- workout_templates: só o professor dono
drop policy if exists templates_all on workout_templates;
create policy templates_all on workout_templates for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid() and public.current_role() = 'professor');

-- template_items: acesso pelo template
drop policy if exists template_items_all on template_items;
create policy template_items_all on template_items for all
  using (
    exists (select 1 from workout_templates t
            where t.id = template_id and t.professor_id = auth.uid())
  )
  with check (
    exists (select 1 from workout_templates t
            where t.id = template_id and t.professor_id = auth.uid())
  );

-- workouts: aluno lê a própria; professor lê/edita as que criou
drop policy if exists workouts_select on workouts;
create policy workouts_select on workouts for select using (
  aluno_id = auth.uid() or professor_id = auth.uid()
);

drop policy if exists workouts_write on workouts;
create policy workouts_write on workouts for all
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid() and public.current_role() = 'professor');

-- workout_items: aluno lê os da própria ficha; professor edita os das fichas que criou
drop policy if exists workout_items_select on workout_items;
create policy workout_items_select on workout_items for select using (
  exists (
    select 1 from workouts w
    where w.id = workout_id
      and (w.aluno_id = auth.uid() or w.professor_id = auth.uid())
  )
);

drop policy if exists workout_items_write on workout_items;
create policy workout_items_write on workout_items for all
  using (
    exists (select 1 from workouts w
            where w.id = workout_id and w.professor_id = auth.uid())
  )
  with check (
    exists (select 1 from workouts w
            where w.id = workout_id and w.professor_id = auth.uid())
  );

-- workout_logs: aluno gerencia os próprios; professor lê os dos seus alunos
drop policy if exists workout_logs_select on workout_logs;
create policy workout_logs_select on workout_logs for select using (
  aluno_id = auth.uid()
  or exists (
    select 1 from workout_items wi
    join workouts w on w.id = wi.workout_id
    where wi.id = workout_item_id and w.professor_id = auth.uid()
  )
);

drop policy if exists workout_logs_write on workout_logs;
create policy workout_logs_write on workout_logs for all
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid());

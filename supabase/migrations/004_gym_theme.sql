-- ============================================================
-- 004 — Personalização de tema e logo por academia
-- ============================================================

alter table gyms
  add column if not exists logo_url       text,
  add column if not exists tema           text default 'roxo',
  add column if not exists cor_primaria   text default '#6366f1',
  add column if not exists cor_secundaria text default '#4f46e5';

-- Bucket público de assets da academia (logo, etc.)
insert into storage.buckets (id, name, public)
values ('gym-assets', 'gym-assets', true)
on conflict (id) do nothing;

-- Qualquer autenticado lê
drop policy if exists "Autenticados leem gym-assets" on storage.objects;
create policy "Autenticados leem gym-assets"
on storage.objects for select
using (bucket_id = 'gym-assets' and auth.role() = 'authenticated');

-- Autenticados podem fazer upload (RLS dos clientes garante que o caminho
-- batem com o gym_id; a verificação fina fica no cliente + app code)
drop policy if exists "Professor faz upload gym-assets" on storage.objects;
create policy "Professor faz upload gym-assets"
on storage.objects for insert
with check (
  bucket_id = 'gym-assets' and auth.role() = 'authenticated'
);

-- Autenticados podem atualizar (necessário pra upsert do logo)
drop policy if exists "Professor atualiza gym-assets" on storage.objects;
create policy "Professor atualiza gym-assets"
on storage.objects for update
using (bucket_id = 'gym-assets' and auth.role() = 'authenticated')
with check (bucket_id = 'gym-assets' and auth.role() = 'authenticated');

-- Autenticados podem deletar (remover logo antigo)
drop policy if exists "Professor deleta gym-assets" on storage.objects;
create policy "Professor deleta gym-assets"
on storage.objects for delete
using (bucket_id = 'gym-assets' and auth.role() = 'authenticated');

-- Professor pode atualizar a própria academia (necessário pro tema/logo_url)
drop policy if exists "Professor atualiza própria academia" on gyms;
create policy "Professor atualiza própria academia"
on gyms for update
using (id = (select gym_id from profiles where id = auth.uid()))
with check (id = (select gym_id from profiles where id = auth.uid()));

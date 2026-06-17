-- ============================================================
-- Storage bucket para GIFs/imagens de exercícios
-- Rode no SQL Editor do Supabase.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('exercise-gifs', 'exercise-gifs', true)
on conflict (id) do nothing;

-- Qualquer autenticado pode ler
drop policy if exists "Autenticados podem ver imagens" on storage.objects;
create policy "Autenticados podem ver imagens"
on storage.objects for select
using (bucket_id = 'exercise-gifs' and auth.role() = 'authenticated');

-- Só service_role pode inserir (via script de importação)
drop policy if exists "Somente service role pode inserir" on storage.objects;
create policy "Somente service role pode inserir"
on storage.objects for insert
with check (bucket_id = 'exercise-gifs' and auth.role() = 'service_role');

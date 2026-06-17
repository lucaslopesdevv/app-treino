-- ============================================================
-- Renomeia exercises.gif_url -> media_url (imagem OU vídeo)
-- + helpers SQL para detectar/extrair video_id do YouTube
-- ============================================================

alter table exercises
  rename column gif_url to media_url;

-- Detecta se é URL do YouTube
create or replace function is_youtube_url(url text)
returns boolean as $$
begin
  return url ~* '(youtube\.com/watch\?v=|youtu\.be/)';
end;
$$ language plpgsql immutable;

-- Extrai o video_id (11 chars) da URL
create or replace function youtube_video_id(url text)
returns text as $$
begin
  if url ~* 'youtu\.be/([a-zA-Z0-9_-]{11})' then
    return substring(url from 'youtu\.be/([a-zA-Z0-9_-]{11})');
  end if;
  if url ~* 'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})' then
    return substring(url from '[?&]v=([a-zA-Z0-9_-]{11})');
  end if;
  return null;
end;
$$ language plpgsql immutable;

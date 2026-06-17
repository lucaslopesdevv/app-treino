/* eslint-disable no-console */
/**
 * Importa exercícios do wger.de para o Supabase.
 *
 * Pré-requisitos:
 *   1. Migration 002 + supabase/storage.sql aplicados.
 *   2. .env na raiz do projeto:
 *        SUPABASE_URL=https://<seu>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...   (NUNCA usar a anon key)
 *   3. Deps: já instaladas (ts-node, @types/node, dotenv).
 *
 * Execução:
 *   npx ts-node --project scripts/tsconfig.json scripts/import-exercises.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const WGER_BASE = 'https://wger.de/api/v2';
const BUCKET = 'exercise-gifs';
const ENGLISH_LANG_ID = 2;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type WgerTranslation = {
  language: number;
  name: string;
};

type WgerImage = {
  image: string;
  is_main: boolean;
};

type WgerCategory = {
  id: number;
  name: string;
};

type WgerExerciseInfo = {
  id: number;
  category: WgerCategory | null;
  translations: WgerTranslation[];
  images: WgerImage[];
};

type WgerPage<T> = {
  count: number;
  next: string | null;
  results: T[];
};

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  while (next) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`wger ${res.status} ${next}`);
    const page = (await res.json()) as WgerPage<T>;
    out.push(...page.results);
    next = page.next;
  }
  return out;
}

function pickName(translations: WgerTranslation[]): string | null {
  const en = translations.find((t) => t.language === ENGLISH_LANG_ID);
  if (en && en.name && en.name.trim().length > 0) return en.name.trim();
  const any = translations.find(
    (t) => typeof t.name === 'string' && t.name.trim().length > 0,
  );
  return any ? any.name.trim() : null;
}

function pickImage(images: WgerImage[]): string | null {
  if (!images || images.length === 0) return null;
  const main = images.find((i) => i.is_main);
  return (main ?? images[0]).image;
}

function extToContentType(ext: string): string {
  if (ext === 'gif') return 'image/gif';
  if (ext === 'png') return 'image/png';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function uploadImage(
  exerciseId: number,
  imageUrl: string,
): Promise<string | null> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    console.warn(`  · falha ao baixar ${imageUrl} (${res.status})`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (imageUrl.split('.').pop() ?? 'jpg').toLowerCase().split('?')[0];
  const path = `${exerciseId}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: extToContentType(ext),
      upsert: true,
    });
  if (error) {
    console.warn(`  · upload falhou (${path}): ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function main() {
  console.log('Buscando exercícios (exerciseinfo) do wger...');
  const exercises = await fetchAllPages<WgerExerciseInfo>(
    `${WGER_BASE}/exerciseinfo/?format=json&limit=100&status=2`,
  );
  console.log(`  encontrados ${exercises.length} exercícios`);

  const candidates = exercises
    .map((e) => {
      const name = pickName(e.translations ?? []);
      const image = pickImage(e.images ?? []);
      const grupo = e.category?.name ?? null;
      return name && image ? { id: e.id, name, image, grupo } : null;
    })
    .filter((x): x is { id: number; name: string; image: string; grupo: string | null } => !!x);

  console.log(`Importando ${candidates.length} exercícios com nome + imagem...`);
  if (candidates.length === 0) {
    console.warn('Nada a importar. Confira a estrutura da API do wger.');
    return;
  }

  let ok = 0;
  let i = 0;
  for (const ex of candidates) {
    i += 1;
    console.log(`[${i}/${candidates.length}] ${ex.name}`);
    const publicUrl = await uploadImage(ex.id, ex.image);
    if (!publicUrl) continue;

    const { error } = await supabase
      .from('exercises')
      .upsert(
        {
          nome: ex.name,
          media_url: publicUrl,
          grupo_muscular: ex.grupo,
          gym_id: null,
        } as never,
        { onConflict: 'nome' } as never,
      );
    if (error) {
      console.warn(`  · upsert falhou: ${error.message}`);
      continue;
    }
    ok += 1;
  }
  console.log(`\n✓ Concluído. ${ok} de ${candidates.length} importados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

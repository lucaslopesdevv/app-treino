import { supabase } from './supabase';
import type { DiaTreino, Workout, WorkoutItem } from '../types/database';

export type DayItems = Record<DiaTreino, WorkoutItem[]>;

export const ALL_DAYS: DiaTreino[] = ['A', 'B', 'C', 'D', 'E'];

export function groupByDay<T extends { dia: DiaTreino; ordem: number }>(
  items: T[],
): Record<DiaTreino, T[]> {
  const out: Record<DiaTreino, T[]> = { A: [], B: [], C: [], D: [], E: [] };
  for (const it of items) out[it.dia].push(it);
  for (const d of ALL_DAYS) out[d].sort((a, b) => a.ordem - b.ordem);
  return out;
}

/**
 * Copia um template para criar uma ficha independente do aluno.
 * Desativa a ficha anterior (se houver) e copia template_items → workout_items.
 */
export async function assignTemplate(params: {
  templateId: string;
  alunoId: string;
  professorId: string;
}): Promise<Workout> {
  const { templateId, alunoId, professorId } = params;

  const { data: template, error: tErr } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  if (tErr || !template) throw tErr ?? new Error('Modelo não encontrado');

  const { error: deactivateErr } = await supabase
    .from('workouts')
    .update({ ativo: false })
    .eq('aluno_id', alunoId)
    .eq('ativo', true);
  if (deactivateErr) throw deactivateErr;

  const { data: newWorkout, error: wErr } = await supabase
    .from('workouts')
    .insert({
      aluno_id: alunoId,
      professor_id: professorId,
      nome: template.nome,
      origem_template_id: templateId,
      ativo: true,
    })
    .select()
    .single();
  if (wErr || !newWorkout) throw wErr ?? new Error('Falha ao criar ficha');

  const { data: items, error: itemsErr } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', templateId);
  if (itemsErr) throw itemsErr;

  if (items && items.length > 0) {
    const rows = items.map((it) => ({
      workout_id: newWorkout.id,
      exercise_id: it.exercise_id,
      dia: it.dia,
      ordem: it.ordem,
      series: it.series,
      reps: it.reps,
      carga: it.carga_sugerida,
      descanso_seg: it.descanso_seg,
    }));
    const { error: insErr } = await supabase.from('workout_items').insert(rows);
    if (insErr) throw insErr;
  }

  return newWorkout;
}

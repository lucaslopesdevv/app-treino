import { supabase } from './supabase';

/**
 * Maior carga registrada pelo aluno em um exercício específico.
 * Retorna null se não houver registros.
 */
export async function getPersonalRecord(
  alunoId: string,
  exerciseId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('vw_personal_records')
    .select('carga_maxima')
    .eq('aluno_id', alunoId)
    .eq('exercise_id', exerciseId)
    .maybeSingle();
  const row = data as { carga_maxima: number | null } | null;
  return row?.carga_maxima ?? null;
}

/**
 * Recordes pessoais do aluno por exercício, ordenados por carga.
 */
export async function listPersonalRecords(
  alunoId: string,
  limit = 5,
): Promise<
  { exercise_id: string; exercise_nome: string; carga_maxima: number }[]
> {
  const { data } = await supabase
    .from('vw_personal_records')
    .select('exercise_id, exercise_nome, carga_maxima')
    .eq('aluno_id', alunoId)
    .order('carga_maxima', { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    exercise_id: string;
    exercise_nome: string;
    carga_maxima: number;
  }[];
}

/**
 * Conta dias consecutivos (até hoje) em que o aluno marcou ao menos um exercício.
 */
export async function computeStreak(alunoId: string): Promise<number> {
  const { data } = await supabase
    .from('workout_logs')
    .select('data')
    .eq('aluno_id', alunoId)
    .eq('feito', true)
    .order('data', { ascending: false })
    .limit(90);
  const rows = (data ?? []) as { data: string }[];
  if (rows.length === 0) return 0;

  const days = new Set(rows.map((r) => r.data));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!days.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toISO(cursor))) return 0;
  }

  while (days.has(toISO(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

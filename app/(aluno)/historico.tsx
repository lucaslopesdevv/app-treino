import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { listPersonalRecords } from '../../lib/records';
import type { WorkoutLog } from '../../types/database';

type LogWithExercise = WorkoutLog & {
  workout_items: {
    exercise_id: string;
    exercises: { nome: string } | null;
  } | null;
};

type Record = {
  exercise_id: string;
  exercise_nome: string;
  carga_maxima: number;
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function Historico() {
  const { session } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<LogWithExercise[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const [logRes, prs] = await Promise.all([
          supabase
            .from('workout_logs')
            .select(
              '*, workout_items(exercise_id, exercises(nome))',
            )
            .eq('aluno_id', session.user.id)
            .eq('feito', true)
            .order('data', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(60),
          listPersonalRecords(session.user.id, 5),
        ]);
        if (cancelled) return;
        setLogs((logRes.data ?? []) as LogWithExercise[]);
        setRecords(prs);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id]),
  );

  const sessions = useMemo(() => {
    const map = new Map<string, LogWithExercise[]>();
    for (const l of logs) {
      const list = map.get(l.data) ?? [];
      list.push(l);
      map.set(l.data, list);
    }
    return Array.from(map.entries()).map(([data, logs]) => ({ data, logs }));
  }, [logs]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <View>
        <Text className="mb-2 text-base font-bold text-white">
          🏆 Recordes pessoais
        </Text>
        {records.length === 0 ? (
          <Text className="text-slate-400">
            Você ainda não tem recordes registrados.
          </Text>
        ) : (
          <View className="gap-2">
            {records.map((r) => (
              <TouchableOpacity
                key={r.exercise_id}
                onPress={() =>
                  router.push(`/(aluno)/evolucao/${r.exercise_id}`)
                }
                className="flex-row items-center justify-between rounded-xl bg-slate-800 p-3"
              >
                <Text className="flex-1 font-semibold text-white">
                  {r.exercise_nome}
                </Text>
                <Text className="text-yellow-400">{r.carga_maxima} kg</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View>
        <Text className="mb-2 text-base font-bold text-white">
          Últimas sessões
        </Text>
        {sessions.length === 0 ? (
          <Text className="text-slate-400">
            Você ainda não registrou treinos.
          </Text>
        ) : (
          <View className="gap-3">
            {sessions.map((s) => (
              <View key={s.data} className="gap-2">
                <Text className="text-sm font-semibold text-slate-300">
                  {formatDate(s.data)}
                </Text>
                {s.logs.map((l) => {
                  const exId = l.workout_items?.exercise_id;
                  const nome = l.workout_items?.exercises?.nome ?? '(exercício)';
                  return (
                    <TouchableOpacity
                      key={l.id}
                      disabled={!exId}
                      onPress={() =>
                        exId && router.push(`/(aluno)/evolucao/${exId}`)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800 p-3"
                    >
                      <Text className="font-semibold text-white">{nome}</Text>
                      <Text className="mt-1 text-sm text-slate-300">
                        {l.carga_real != null
                          ? `${l.carga_real} kg`
                          : 'sem carga'}
                        {l.reps_real != null && ` · ${l.reps_real} reps`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { ExerciseMedia } from '../../../components/ExerciseMedia';

type LogRow = {
  id: string;
  data: string;
  carga_real: number | null;
  reps_real: number | null;
  workout_items: { exercise_id: string } | null;
};

function fmt(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function Evolucao() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { session } = useAuth();
  const [exerciseName, setExerciseName] = useState('Exercício');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user || !exerciseId) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const sinceISO = since.toISOString().slice(0, 10);

        const [{ data: ex }, { data: logRows }] = await Promise.all([
          supabase
            .from('exercises')
            .select('nome, media_url')
            .eq('id', exerciseId)
            .maybeSingle(),
          supabase
            .from('workout_logs')
            .select(
              'id, data, carga_real, reps_real, workout_items!inner(exercise_id)',
            )
            .eq('aluno_id', session.user.id)
            .eq('feito', true)
            .eq('workout_items.exercise_id', exerciseId)
            .gte('data', sinceISO)
            .order('data', { ascending: true }),
        ]);
        if (cancelled) return;
        const exRow = ex as { nome: string; media_url: string | null } | null;
        if (exRow?.nome) setExerciseName(exRow.nome);
        setMediaUrl(exRow?.media_url ?? null);
        setLogs((logRows ?? []) as unknown as LogRow[]);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id, exerciseId]),
  );

  const series = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const l of logs) {
      if (l.carga_real == null) continue;
      const cur = byDate.get(l.data) ?? 0;
      if (l.carga_real > cur) byDate.set(l.data, l.carga_real);
    }
    const sorted = Array.from(byDate.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return {
      labels: sorted.map(([d]) => fmt(d)),
      values: sorted.map(([, v]) => v),
    };
  }, [logs]);

  const recent = useMemo(
    () => [...logs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10),
    [logs],
  );

  const maxValue = useMemo(
    () => (series.values.length > 0 ? Math.max(...series.values) : 0),
    [series.values],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const chartWidth = Dimensions.get('window').width - 32;

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-2xl font-bold text-white">{exerciseName}</Text>
      <Text className="mt-1 text-sm text-slate-400">Evolução de carga · últimos 30 dias</Text>

      <View className="mt-4">
        <ExerciseMedia mediaUrl={mediaUrl} />
      </View>

      {series.values.length < 2 ? (
        <View className="mt-8 items-center rounded-xl bg-slate-800 p-6">
          <Text className="text-center text-slate-300">
            Treine mais vezes para ver sua evolução
          </Text>
        </View>
      ) : (
        <View className="mt-4 overflow-hidden rounded-xl bg-slate-800 p-2">
          <LineChart
            data={{
              labels: series.labels,
              datasets: [{ data: series.values }],
            }}
            width={chartWidth}
            height={220}
            yAxisSuffix="kg"
            fromZero
            chartConfig={{
              backgroundGradientFrom: '#1e293b',
              backgroundGradientTo: '#1e293b',
              decimalPlaces: 0,
              color: (o = 1) => `rgba(37,99,235,${o})`,
              labelColor: (o = 1) => `rgba(203,213,225,${o})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#2563eb' },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
          <Text className="mt-2 text-center text-xs text-slate-400">
            Recorde: {maxValue} kg
          </Text>
        </View>
      )}

      <Text className="mt-6 text-base font-semibold text-white">
        Últimos registros
      </Text>
      <View className="mt-2 gap-2">
        {recent.length === 0 ? (
          <Text className="text-slate-400">Nenhum registro ainda.</Text>
        ) : (
          recent.map((l) => (
            <View
              key={l.id}
              className="flex-row items-center justify-between rounded-xl bg-slate-800 p-3"
            >
              <Text className="text-slate-300">{fmt(l.data)}</Text>
              <Text className="font-semibold text-white">
                {l.carga_real != null ? `${l.carga_real} kg` : 'sem carga'}
                {l.reps_real != null && ` · ${l.reps_real} reps`}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

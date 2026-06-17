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
import { useTheme } from '../../hooks/useTheme';
import { ALL_DAYS } from '../../lib/workouts';
import { computeStreak } from '../../lib/records';
import type { DiaTreino, Workout, WorkoutItem } from '../../types/database';

type ItemWithExercise = WorkoutItem & { exercises: { nome: string } | null };

export default function MeuTreino() {
  const { session, profile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<ItemWithExercise[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dia, setDia] = useState<DiaTreino>('A');

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const [{ data: w }, s] = await Promise.all([
          supabase
            .from('workouts')
            .select('*')
            .eq('aluno_id', session.user.id)
            .eq('ativo', true)
            .maybeSingle(),
          computeStreak(session.user.id),
        ]);
        if (cancelled) return;
        setStreak(s);
        setWorkout(w ?? null);
        if (w) {
          const { data: its } = await supabase
            .from('workout_items')
            .select('*, exercises(nome)')
            .eq('workout_id', w.id)
            .order('ordem');
          if (cancelled) return;
          const list = (its ?? []) as ItemWithExercise[];
          setItems(list);
          const available = ALL_DAYS.filter((d) =>
            list.some((it) => it.dia === d),
          );
          if (available.length > 0 && !available.includes(dia)) {
            setDia(available[0]);
          }
        } else {
          setItems([]);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id]),
  );

  const daysAvailable = useMemo(
    () => ALL_DAYS.filter((d) => items.some((it) => it.dia === d)),
    [items],
  );

  const itemsOfDay = useMemo(
    () => items.filter((it) => it.dia === dia),
    [items, dia],
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <Text className="text-center text-base text-slate-300">
          Seu professor ainda não atribuiu um treino
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <View className="border-b border-slate-800 p-4">
        {profile?.nome && (
          <Text className="text-sm text-slate-400">Olá, {profile.nome}</Text>
        )}
        <Text className="text-xl font-bold text-white">{workout.nome}</Text>
        {streak >= 2 && (
          <Text className="mt-1 text-sm font-semibold text-orange-400">
            🔥 {streak} dias seguidos
          </Text>
        )}
      </View>

      <View className="flex-row gap-2 px-4 pt-3">
        {daysAvailable.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDia(d)}
            className="flex-1 items-center rounded-lg py-2"
            style={{
              backgroundColor: dia === d ? theme.cor_primaria : '#1e293b',
            }}
          >
            <Text className="font-semibold text-white">{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {itemsOfDay.map((it, idx) => (
          <View
            key={it.id}
            className="rounded-xl border border-slate-700 bg-slate-800 p-4"
          >
            <Text className="text-base font-semibold text-white">
              {idx + 1}. {it.exercises?.nome ?? '(exercício)'}
            </Text>
            <Text className="mt-1 text-sm text-slate-300">
              {it.series} séries x {it.reps} reps
              {it.carga != null && ` · ${it.carga} kg`}
              {it.descanso_seg != null && ` · ${it.descanso_seg}s descanso`}
            </Text>
          </View>
        ))}
      </ScrollView>

      {itemsOfDay.length > 0 && (
        <View className="border-t border-slate-800 p-4">
          <TouchableOpacity
            onPress={() => router.push(`/(aluno)/execucao/${dia}`)}
            className="items-center rounded-xl py-3.5"
            style={{ backgroundColor: theme.cor_primaria }}
          >
            <Text className="text-base font-semibold text-white">
              Iniciar treino {dia}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

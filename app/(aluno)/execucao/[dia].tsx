import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { ExerciseMedia } from '../../../components/ExerciseMedia';
import type {
  DiaTreino,
  WorkoutItem,
  WorkoutLog,
} from '../../../types/database';

type ItemWithExercise = WorkoutItem & {
  exercises: { nome: string; media_url: string | null } | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Execucao() {
  const { dia } = useLocalSearchParams<{ dia: DiaTreino }>();
  const { session } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<ItemWithExercise[]>([]);
  const [logs, setLogs] = useState<Record<string, WorkoutLog>>({});
  const [cargas, setCargas] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<Record<string, number>>({});
  const [openGif, setOpenGif] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [showCompletion, setShowCompletion] = useState(false);
  const [completionShown, setCompletionShown] = useState(false);
  const [newRecordsCount, setNewRecordsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user || !dia) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        setCompletionShown(false);
        const { data: w } = await supabase
          .from('workouts')
          .select('id')
          .eq('aluno_id', session.user.id)
          .eq('ativo', true)
          .maybeSingle();
        if (cancelled || !w) {
          setLoading(false);
          return;
        }
        const { data: its } = await supabase
          .from('workout_items')
          .select('*, exercises(nome, media_url)')
          .eq('workout_id', (w as { id: string }).id)
          .eq('dia', dia)
          .order('ordem');
        if (cancelled) return;
        const list = (its ?? []) as ItemWithExercise[];
        setItems(list);

        const itemIds = list.map((i) => i.id);
        const exerciseIds = Array.from(new Set(list.map((i) => i.exercise_id)));

        const byItem: Record<string, WorkoutLog> = {};
        if (itemIds.length > 0) {
          const { data: ls } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('aluno_id', session.user.id)
            .eq('data', todayISO())
            .in('workout_item_id', itemIds);
          if (cancelled) return;
          for (const l of (ls ?? []) as WorkoutLog[]) {
            byItem[l.workout_item_id] = l;
          }
        }
        setLogs(byItem);

        const recordsMap: Record<string, number> = {};
        if (exerciseIds.length > 0) {
          const { data: prs } = await supabase
            .from('vw_personal_records')
            .select('exercise_id, carga_maxima')
            .eq('aluno_id', session.user.id)
            .in('exercise_id', exerciseIds);
          if (cancelled) return;
          for (const r of (prs ?? []) as {
            exercise_id: string;
            carga_maxima: number;
          }[]) {
            recordsMap[r.exercise_id] = r.carga_maxima;
          }
        }
        setRecords(recordsMap);

        const initCargas: Record<string, string> = {};
        for (const it of list) {
          const existing = byItem[it.id]?.carga_real;
          initCargas[it.id] =
            existing != null
              ? String(existing)
              : it.carga != null
                ? String(it.carga)
                : '';
        }
        setCargas(initCargas);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id, dia]),
  );

  useEffect(() => {
    if (loading || completionShown) return;
    if (items.length === 0) return;
    const done = items.filter((it) => logs[it.id]?.feito).length;
    if (done === items.length) {
      const newRecs = items.reduce((acc, it) => {
        const cur = logs[it.id]?.carga_real;
        if (cur == null) return acc;
        const prior = records[it.exercise_id];
        if (prior == null || cur > prior) return acc + 1;
        return acc;
      }, 0);
      setNewRecordsCount(newRecs);
      setShowCompletion(true);
      setCompletionShown(true);
    }
  }, [logs, items, records, loading, completionShown]);

  async function toggleFeito(item: ItemWithExercise) {
    if (!session?.user) return;
    setPendingId(item.id);
    try {
      const existing = logs[item.id];
      const cargaStr = cargas[item.id]?.trim() ?? '';
      const cargaReal = cargaStr ? parseFloat(cargaStr) : null;
      const reps = parseFirstNumber(item.reps);

      if (existing) {
        const newFeito = !existing.feito;
        const { data, error } = await supabase
          .from('workout_logs')
          .update({
            feito: newFeito,
            carga_real: cargaReal,
            reps_real: reps,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        if (data)
          setLogs((p) => ({ ...p, [item.id]: data as WorkoutLog }));
      } else {
        const { data, error } = await supabase
          .from('workout_logs')
          .insert({
            workout_item_id: item.id,
            aluno_id: session.user.id,
            feito: true,
            carga_real: cargaReal,
            reps_real: reps,
          })
          .select()
          .single();
        if (error) throw error;
        if (data)
          setLogs((p) => ({ ...p, [item.id]: data as WorkoutLog }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const done = items.filter((it) => logs[it.id]?.feito).length;

  return (
    <View className="flex-1 bg-slate-900">
      <View className="border-b border-slate-800 p-4">
        <Text className="text-lg font-semibold text-white">
          Treino {dia} — {done} de {items.length} concluídos
        </Text>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
          <View
            className="h-full"
            style={{
              width: `${items.length ? (done / items.length) * 100 : 0}%`,
              backgroundColor: theme.cor_primaria,
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items.length === 0 && (
          <Text className="mt-12 text-center text-slate-400">
            Sem exercícios neste dia.
          </Text>
        )}
        {items.map((it, idx) => {
          const log = logs[it.id];
          const feito = !!log?.feito;
          const cargaStr = cargas[it.id] ?? '';
          const cargaNum = cargaStr ? parseFloat(cargaStr) : null;
          const pr = records[it.exercise_id] ?? null;
          const isNewRecord =
            cargaNum != null && (pr == null || cargaNum > pr);
          const showGif = openGif[it.id] ?? false;

          return (
            <View
              key={it.id}
              className={`rounded-xl border p-4 ${
                feito
                  ? 'border-green-600 bg-green-900/30'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-semibold text-white">
                  {idx + 1}. {it.exercises?.nome ?? '(exercício)'}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(aluno)/evolucao/${it.exercise_id}`)
                  }
                  className="ml-2 rounded-lg bg-slate-700 px-2 py-1"
                >
                  <Text className="text-sm text-white">📈</Text>
                </TouchableOpacity>
              </View>

              <Text className="mt-1 text-sm text-slate-300">
                {it.series} séries x {it.reps} reps
                {it.descanso_seg != null && ` · ${it.descanso_seg}s descanso`}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setOpenGif((p) => ({ ...p, [it.id]: !showGif }))
                }
                className="mt-3 self-start"
              >
                <Text className="text-sm text-blue-400">
                  {showGif ? 'Ocultar mídia' : 'Ver mídia'}
                </Text>
              </TouchableOpacity>

              {showGif && (
                <View className="mt-2">
                  <ExerciseMedia
                    mediaUrl={it.exercises?.media_url}
                    collapsible={false}
                  />
                </View>
              )}

              <Text className="mt-3 text-xs text-slate-400">
                Carga usada (kg)
              </Text>
              <TextInput
                value={cargaStr}
                onChangeText={(t) =>
                  setCargas((p) => ({ ...p, [it.id]: t }))
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#64748b"
                className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />

              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-xs text-slate-400">
                  {pr != null ? `Seu recorde: ${pr} kg` : 'Sem recorde anterior'}
                </Text>
                {isNewRecord && (
                  <Text className="text-xs font-semibold text-green-400">
                    🏆 Novo recorde!
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={() => toggleFeito(it)}
                disabled={pendingId === it.id}
                className={`mt-3 items-center rounded-lg py-2.5 ${
                  pendingId === it.id ? 'opacity-60' : ''
                }`}
                style={{
                  backgroundColor: feito ? '#15803d' : theme.cor_primaria,
                }}
              >
                {pendingId === it.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">
                    {feito ? '✓ Feito (desmarcar)' : 'Marcar como feito'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={showCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletion(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-2xl bg-slate-800 p-6">
            <Text className="text-center text-2xl font-bold text-white">
              Treino {dia} concluído! 💪
            </Text>
            <Text className="mt-3 text-center text-base text-slate-300">
              {done} de {items.length} exercícios feitos
            </Text>
            {newRecordsCount > 0 && (
              <Text className="mt-1 text-center text-base font-semibold text-green-400">
                🏆 {newRecordsCount}{' '}
                {newRecordsCount === 1
                  ? 'novo recorde batido'
                  : 'novos recordes batidos'}
              </Text>
            )}

            <View className="mt-6 gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowCompletion(false);
                  router.push('/(aluno)/historico');
                }}
                className="items-center rounded-xl py-3"
                style={{ backgroundColor: theme.cor_primaria }}
              >
                <Text className="font-semibold text-white">Ver evolução</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCompletion(false)}
                className="items-center rounded-xl bg-slate-700 py-3"
              >
                <Text className="font-semibold text-white">Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function parseFirstNumber(reps: string): number | null {
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

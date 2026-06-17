import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { ALL_DAYS, assignTemplate } from '../../../lib/workouts';
import type {
  DiaTreino,
  Profile,
  Workout,
  WorkoutItem,
  WorkoutTemplate,
} from '../../../types/database';

type ItemWithExercise = WorkoutItem & { exercises: { nome: string } | null };

export default function AlunoFicha() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [aluno, setAluno] = useState<Profile | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [items, setItems] = useState<ItemWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dia, setDia] = useState<DiaTreino>('A');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<
    Record<string, { series: string; reps: string; carga: string }>
  >({});
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    const [{ data: prof }, { data: w }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('workouts')
        .select('*')
        .eq('aluno_id', id)
        .eq('ativo', true)
        .maybeSingle(),
    ]);
    setAluno(prof ?? null);
    setWorkout(w ?? null);
    if (w) {
      const { data: its } = await supabase
        .from('workout_items')
        .select('*, exercises(nome)')
        .eq('workout_id', w.id)
        .order('ordem');
      const list = (its ?? []) as ItemWithExercise[];
      setItems(list);
      const daysAvailable = ALL_DAYS.filter((d) =>
        list.some((it) => it.dia === d),
      );
      if (daysAvailable.length > 0 && !daysAvailable.includes(dia)) {
        setDia(daysAvailable[0]);
      }
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const daysAvailable = useMemo(
    () => ALL_DAYS.filter((d) => items.some((it) => it.dia === d)),
    [items],
  );

  const itemsOfDay = useMemo(
    () => items.filter((it) => it.dia === dia),
    [items, dia],
  );

  function enterEdit() {
    const init: typeof editValues = {};
    for (const it of items) {
      init[it.id] = {
        series: String(it.series),
        reps: it.reps,
        carga: it.carga != null ? String(it.carga) : '',
      };
    }
    setEditValues(init);
    setEditMode(true);
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const updates = items
        .map((it) => {
          const v = editValues[it.id];
          if (!v) return null;
          const series = parseInt(v.series, 10) || it.series;
          const reps = v.reps.trim() || it.reps;
          const carga = v.carga.trim() ? parseFloat(v.carga) : null;
          if (
            series === it.series &&
            reps === it.reps &&
            (carga ?? null) === (it.carga ?? null)
          ) {
            return null;
          }
          return { id: it.id, series, reps, carga };
        })
        .filter((x): x is { id: string; series: number; reps: string; carga: number | null } => !!x);

      for (const u of updates) {
        const { error } = await supabase
          .from('workout_items')
          .update({ series: u.series, reps: u.reps, carga: u.carga })
          .eq('id', u.id);
        if (error) throw error;
      }
      setEditMode(false);
      await refresh();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(template: WorkoutTemplate) {
    if (!session?.user || !id) return;
    try {
      await assignTemplate({
        templateId: template.id,
        alunoId: id,
        professorId: session.user.id,
      });
      setPickerOpen(false);
      await refresh();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível atribuir o modelo.');
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <View className="border-b border-slate-800 p-4">
        <Text className="text-xl font-bold text-white">
          {aluno?.nome ?? 'Aluno'}
        </Text>
        {workout && (
          <Text className="mt-1 text-sm text-slate-400">{workout.nome}</Text>
        )}
      </View>

      {erro && (
        <Text className="bg-red-900/40 px-4 py-3 text-center text-red-200">
          {erro}
        </Text>
      )}

      {!workout ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-slate-300">
            Aluno sem treino atribuído
          </Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            className="rounded-xl bg-blue-600 px-6 py-3"
          >
            <Text className="font-semibold text-white">Atribuir treino</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="flex-row gap-2 px-4 pt-3">
            {daysAvailable.map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDia(d)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  dia === d ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <Text className="font-semibold text-white">{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {itemsOfDay.length === 0 ? (
              <Text className="py-4 text-center text-slate-400">
                Sem exercícios no dia {dia}
              </Text>
            ) : (
              itemsOfDay.map((it, idx) => (
                <View
                  key={it.id}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                >
                  <Text className="text-base font-semibold text-white">
                    {idx + 1}. {it.exercises?.nome ?? '(exercício)'}
                  </Text>
                  {editMode ? (
                    <View className="mt-2 gap-2">
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Text className="text-xs text-slate-400">Séries</Text>
                          <TextInput
                            value={editValues[it.id]?.series ?? ''}
                            onChangeText={(t) =>
                              setEditValues((p) => ({
                                ...p,
                                [it.id]: { ...p[it.id], series: t },
                              }))
                            }
                            keyboardType="number-pad"
                            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-slate-400">Reps</Text>
                          <TextInput
                            value={editValues[it.id]?.reps ?? ''}
                            onChangeText={(t) =>
                              setEditValues((p) => ({
                                ...p,
                                [it.id]: { ...p[it.id], reps: t },
                              }))
                            }
                            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs text-slate-400">Carga</Text>
                          <TextInput
                            value={editValues[it.id]?.carga ?? ''}
                            onChangeText={(t) =>
                              setEditValues((p) => ({
                                ...p,
                                [it.id]: { ...p[it.id], carga: t },
                              }))
                            }
                            keyboardType="decimal-pad"
                            className="mt-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Text className="mt-1 text-sm text-slate-300">
                      {it.series} séries x {it.reps} reps
                      {it.carga != null && ` · ${it.carga} kg`}
                      {it.descanso_seg != null && ` · ${it.descanso_seg}s`}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View className="flex-row gap-2 border-t border-slate-800 p-4">
            {editMode ? (
              <>
                <TouchableOpacity
                  onPress={() => setEditMode(false)}
                  className="flex-1 items-center rounded-xl bg-slate-700 py-3"
                >
                  <Text className="font-semibold text-white">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEdits}
                  disabled={saving}
                  className={`flex-1 items-center rounded-xl bg-blue-600 py-3 ${
                    saving ? 'opacity-60' : ''
                  }`}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white">Salvar</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={enterEdit}
                  className="flex-1 items-center rounded-xl bg-slate-700 py-3"
                >
                  <Text className="font-semibold text-white">Editar ficha</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPickerOpen(true)}
                  className="flex-1 items-center rounded-xl bg-blue-600 py-3"
                >
                  <Text className="font-semibold text-white">Trocar treino</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}

      <TemplatePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handleAssign}
      />
    </View>
  );
}

function TemplatePickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (t: WorkoutTemplate) => void;
}) {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!visible || !session?.user) return;
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('professor_id', session.user.id)
          .order('created_at', { ascending: false });
        setTemplates(data ?? []);
        setLoading(false);
      })();
    }, [visible, session?.user?.id]),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-slate-900">
        <View className="flex-row items-center justify-between border-b border-slate-800 p-4">
          <Text className="text-lg font-semibold text-white">
            Escolher modelo
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-400">Cancelar</Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator className="mt-8" color="#fff" />
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            ListEmptyComponent={
              <Text className="mt-12 text-center text-slate-400">
                Você ainda não tem modelos. Crie um na aba Modelos.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onPick(item)}
                className="rounded-xl bg-slate-800 p-4"
              >
                <Text className="font-semibold text-white">{item.nome}</Text>
                {item.descricao && (
                  <Text className="mt-1 text-sm text-slate-400">
                    {item.descricao}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

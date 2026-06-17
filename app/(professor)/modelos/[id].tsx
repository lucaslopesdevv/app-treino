import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ExerciseMedia } from '../../../components/ExerciseMedia';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { ALL_DAYS } from '../../../lib/workouts';
import type { DiaTreino, Exercise } from '../../../types/database';

type EditableItem = {
  tempId: string;
  exercise_id: string;
  exercise_nome: string;
  series: number;
  reps: string;
  carga_sugerida: number | null;
  descanso_seg: number | null;
};

let _counter = 0;
const tempId = () => `tmp-${Date.now()}-${++_counter}`;

const emptyByDay = (): Record<DiaTreino, EditableItem[]> => ({
  A: [],
  B: [],
  C: [],
  D: [],
  E: [],
});

export default function ModeloEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const isNew = id === 'novo';

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dia, setDia] = useState<DiaTreino>('A');
  const [itemsByDay, setItemsByDay] = useState(emptyByDay());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: tpl, error: tErr }, { data: items, error: iErr }] =
        await Promise.all([
          supabase.from('workout_templates').select('*').eq('id', id).single(),
          supabase
            .from('template_items')
            .select('*, exercises(nome)')
            .eq('template_id', id)
            .order('ordem'),
        ]);
      if (cancelled) return;
      if (tErr || !tpl) {
        setErro('Não foi possível carregar o modelo.');
        setLoading(false);
        return;
      }
      setNome(tpl.nome);
      setDescricao(tpl.descricao ?? '');
      if (iErr) {
        setErro('Não foi possível carregar os exercícios.');
      } else {
        const grouped = emptyByDay();
        for (const it of items ?? []) {
          const row = it as typeof it & { exercises: { nome: string } | null };
          grouped[row.dia as DiaTreino].push({
            tempId: tempId(),
            exercise_id: row.exercise_id,
            exercise_nome: row.exercises?.nome ?? '(exercício removido)',
            series: row.series,
            reps: row.reps,
            carga_sugerida: row.carga_sugerida,
            descanso_seg: row.descanso_seg,
          });
        }
        setItemsByDay(grouped);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  function removeItem(d: DiaTreino, tempIdToRemove: string) {
    setItemsByDay((prev) => ({
      ...prev,
      [d]: prev[d].filter((i) => i.tempId !== tempIdToRemove),
    }));
  }

  function addItem(item: EditableItem) {
    setItemsByDay((prev) => ({ ...prev, [dia]: [...prev[dia], item] }));
  }

  async function salvar() {
    if (!session?.user) return;
    if (!nome.trim()) {
      setErro('Informe um nome para o modelo.');
      return;
    }
    setErro(null);
    setSaving(true);

    try {
      let templateId = isNew ? null : (id as string);

      if (isNew) {
        const { data, error } = await supabase
          .from('workout_templates')
          .insert({
            professor_id: session.user.id,
            nome: nome.trim(),
            descricao: descricao.trim() || null,
          })
          .select()
          .single();
        if (error || !data) throw error ?? new Error('Falha ao criar modelo');
        templateId = data.id;
      } else {
        const { error } = await supabase
          .from('workout_templates')
          .update({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
          })
          .eq('id', templateId!);
        if (error) throw error;

        const { error: delErr } = await supabase
          .from('template_items')
          .delete()
          .eq('template_id', templateId!);
        if (delErr) throw delErr;
      }

      const rows: {
        template_id: string;
        exercise_id: string;
        dia: DiaTreino;
        ordem: number;
        series: number;
        reps: string;
        carga_sugerida: number | null;
        descanso_seg: number | null;
      }[] = [];
      for (const d of ALL_DAYS) {
        itemsByDay[d].forEach((it, idx) => {
          rows.push({
            template_id: templateId!,
            exercise_id: it.exercise_id,
            dia: d,
            ordem: idx + 1,
            series: it.series,
            reps: it.reps,
            carga_sugerida: it.carga_sugerida,
            descanso_seg: it.descanso_seg,
          });
        });
      }
      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from('template_items')
          .insert(rows);
        if (insErr) throw insErr;
      }

      router.replace('/(professor)/modelos');
    } catch (e) {
      console.error(e);
      setErro('Não foi possível salvar o modelo.');
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-sm font-medium text-slate-300">Nome</Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Hipertrofia 3x por semana"
          placeholderTextColor="#64748b"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white"
        />

        <Text className="mt-2 text-sm font-medium text-slate-300">
          Descrição (opcional)
        </Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Notas sobre o modelo"
          placeholderTextColor="#64748b"
          multiline
          className="min-h-[80px] rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white"
        />

        <View className="mt-3 flex-row gap-2">
          {ALL_DAYS.map((d) => (
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

        <View className="mt-3 gap-2">
          {itemsByDay[dia].length === 0 ? (
            <Text className="py-4 text-center text-slate-400">
              Nenhum exercício no dia {dia}
            </Text>
          ) : (
            itemsByDay[dia].map((it, idx) => (
              <View
                key={it.tempId}
                className="rounded-xl border border-slate-700 bg-slate-800 p-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-base font-semibold text-white">
                    {idx + 1}. {it.exercise_nome}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeItem(dia, it.tempId)}
                    className="px-2"
                  >
                    <Text className="text-red-400">remover</Text>
                  </TouchableOpacity>
                </View>
                <Text className="mt-1 text-sm text-slate-300">
                  {it.series} séries x {it.reps} reps
                  {it.carga_sugerida != null && ` · ${it.carga_sugerida} kg`}
                  {it.descanso_seg != null && ` · ${it.descanso_seg}s descanso`}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          className="mt-2 items-center rounded-xl border border-dashed border-blue-500 py-3"
        >
          <Text className="font-semibold text-blue-400">
            + Adicionar exercício ao dia {dia}
          </Text>
        </TouchableOpacity>

        {erro && (
          <Text className="mt-2 text-center text-red-400">{erro}</Text>
        )}

        <TouchableOpacity
          onPress={salvar}
          disabled={saving}
          className={`mt-4 items-center rounded-xl bg-blue-600 py-3.5 ${
            saving ? 'opacity-60' : ''
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Salvar modelo
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <AddExerciseModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(item) => {
          addItem(item);
          setModalOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function AddExerciseModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: EditableItem) => void;
}) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const [series, setSeries] = useState('3');
  const [reps, setReps] = useState('10');
  const [carga, setCarga] = useState('');
  const [descanso, setDescanso] = useState('60');

  async function loadExercises() {
    setLoading(true);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('nome');
    setExercises((data ?? []) as Exercise[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!visible) return;
    setSelected(null);
    setSearch('');
    setSeries('3');
    setReps('10');
    setCarga('');
    setDescanso('60');
    loadExercises();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.nome.toLowerCase().includes(q));
  }, [exercises, search]);

  function confirm() {
    if (!selected) return;
    const seriesNum = parseInt(series, 10);
    if (!seriesNum || seriesNum < 1) {
      Alert.alert('Informe um número de séries válido.');
      return;
    }
    if (!reps.trim()) {
      Alert.alert('Informe as repetições.');
      return;
    }
    onAdd({
      tempId: tempId(),
      exercise_id: selected.id,
      exercise_nome: selected.nome,
      series: seriesNum,
      reps: reps.trim(),
      carga_sugerida: carga.trim() ? parseFloat(carga) : null,
      descanso_seg: descanso.trim() ? parseInt(descanso, 10) : null,
    });
  }

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
            {creating
              ? 'Novo exercício'
              : selected
                ? 'Configurar exercício'
                : 'Escolher exercício'}
          </Text>
          <TouchableOpacity onPress={creating ? () => setCreating(false) : onClose}>
            <Text className="text-blue-400">
              {creating ? 'Voltar' : 'Cancelar'}
            </Text>
          </TouchableOpacity>
        </View>

        {creating ? (
          <NewExerciseForm
            onSaved={async () => {
              setCreating(false);
              await loadExercises();
            }}
          />
        ) : !selected ? (
          <View className="flex-1">
            <View className="gap-2 p-4">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nome..."
                placeholderTextColor="#64748b"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />
              <TouchableOpacity
                onPress={() => setCreating(true)}
                className="items-center rounded-xl border border-dashed border-blue-500 py-2"
              >
                <Text className="font-semibold text-blue-400">
                  + Novo exercício
                </Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator className="mt-8" color="#fff" />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, gap: 8 }}
                ListEmptyComponent={
                  <Text className="text-center text-slate-400">
                    Nenhum exercício encontrado
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelected(item)}
                    className="flex-row items-center gap-3 rounded-xl bg-slate-800 p-3"
                  >
                    <View style={{ width: 80 }}>
                      <ExerciseMedia
                        mediaUrl={item.media_url}
                        height={80}
                        collapsible={false}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-white">
                        {item.nome}
                      </Text>
                      {item.grupo_muscular && (
                        <Text className="mt-0.5 text-sm text-slate-400">
                          {item.grupo_muscular}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text className="text-lg font-semibold text-white">
                {selected.nome}
              </Text>

              <Text className="mt-2 text-sm text-slate-300">Séries</Text>
              <TextInput
                value={series}
                onChangeText={setSeries}
                keyboardType="number-pad"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />

              <Text className="text-sm text-slate-300">
                Repetições (ex: 10 ou 8-12)
              </Text>
              <TextInput
                value={reps}
                onChangeText={setReps}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />

              <Text className="text-sm text-slate-300">
                Carga sugerida (kg) — opcional
              </Text>
              <TextInput
                value={carga}
                onChangeText={setCarga}
                keyboardType="decimal-pad"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />

              <Text className="text-sm text-slate-300">
                Descanso (segundos) — opcional
              </Text>
              <TextInput
                value={descanso}
                onChangeText={setDescanso}
                keyboardType="number-pad"
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
              />

              <TouchableOpacity
                onPress={() => setSelected(null)}
                className="mt-2 items-center py-2"
              >
                <Text className="text-slate-300">← Trocar exercício</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirm}
                className="mt-2 items-center rounded-xl bg-blue-600 py-3.5"
              >
                <Text className="text-base font-semibold text-white">
                  Adicionar ao dia
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

function NewExerciseForm({ onSaved }: { onSaved: () => void }) {
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState('');
  const [media, setMedia] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPreviewUrl(media.trim()), 800);
    return () => clearTimeout(t);
  }, [media]);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do exercício.');
      return;
    }
    setErro(null);
    setSaving(true);
    const { error } = await supabase.from('exercises').insert({
      nome: nome.trim(),
      grupo_muscular: grupo.trim() || null,
      media_url: media.trim() || null,
      gym_id: null,
    } as never);
    setSaving(false);
    if (error) {
      setErro(
        error.message.includes('duplicate')
          ? 'Já existe um exercício com esse nome.'
          : 'Não foi possível salvar.',
      );
      return;
    }
    onSaved();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-sm text-slate-300">Nome</Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Supino inclinado com halteres"
          placeholderTextColor="#64748b"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
        />

        <Text className="text-sm text-slate-300">
          Grupo muscular (opcional)
        </Text>
        <TextInput
          value={grupo}
          onChangeText={setGrupo}
          placeholder="Ex: Peito"
          placeholderTextColor="#64748b"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
        />

        <Text className="text-sm text-slate-300">Mídia do exercício</Text>
        <TextInput
          value={media}
          onChangeText={setMedia}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="URL de imagem ou link do YouTube"
          placeholderTextColor="#64748b"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
        />

        <Text className="mt-2 text-xs text-slate-400">Pré-visualização</Text>
        <ExerciseMedia
          mediaUrl={previewUrl || null}
          collapsible={false}
          height={180}
        />

        {erro && <Text className="text-center text-red-400">{erro}</Text>}

        <TouchableOpacity
          onPress={salvar}
          disabled={saving}
          className={`mt-2 items-center rounded-xl bg-blue-600 py-3.5 ${
            saving ? 'opacity-60' : ''
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Salvar exercício
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

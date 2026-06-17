import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import type { WorkoutTemplate } from '../../../types/database';

export default function ModelosList() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const [modelos, setModelos] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        setErro(null);
        const { data, error } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('professor_id', session.user.id)
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error) setErro('Não foi possível carregar os modelos.');
        else setModelos(data ?? []);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [session?.user?.id]),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      <View className="px-4 pb-2 pt-4">
        <Link href="/(professor)/modelos/novo" asChild>
          <TouchableOpacity
            className="items-center rounded-xl py-3"
            style={{ backgroundColor: theme.cor_primaria }}
          >
            <Text className="text-base font-semibold text-white">
              Novo modelo
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

      {erro && (
        <Text className="bg-red-900/40 px-4 py-3 text-center text-red-200">
          {erro}
        </Text>
      )}

      <FlatList
        data={modelos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-slate-400">
            Nenhum modelo criado ainda
          </Text>
        }
        renderItem={({ item }) => (
          <View className="rounded-xl bg-slate-800 p-4">
            <Text className="text-base font-semibold text-white">
              {item.nome}
            </Text>
            {item.descricao && (
              <Text className="mt-1 text-sm text-slate-300">
                {item.descricao}
              </Text>
            )}
            <Link href={`/(professor)/modelos/${item.id}`} asChild>
              <TouchableOpacity
                className="mt-3 self-start rounded-lg px-4 py-2"
                style={{ backgroundColor: theme.cor_primaria }}
              >
                <Text className="font-semibold text-white">Editar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      />
    </View>
  );
}

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useTheme';
import type { Profile } from '../../types/database';

export default function AlunosList() {
  const { theme } = useTheme();
  const [alunos, setAlunos] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setErro(null);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'aluno')
          .order('nome');
        if (cancelled) return;
        if (error) setErro('Não foi possível carregar os alunos.');
        else setAlunos(data ?? []);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
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
      {erro && (
        <Text className="bg-red-900/40 px-4 py-3 text-center text-red-200">
          {erro}
        </Text>
      )}

      <FlatList
        data={alunos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text className="mt-12 text-center text-slate-400">
            Nenhum aluno cadastrado ainda
          </Text>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between rounded-xl bg-slate-800 p-4">
            <Text className="flex-1 text-base font-medium text-white">
              {item.nome}
            </Text>
            <Link href={`/(professor)/alunos/${item.id}`} asChild>
              <TouchableOpacity
                className="rounded-lg px-4 py-2"
                style={{ backgroundColor: theme.cor_primaria }}
              >
                <Text className="font-semibold text-white">Ver ficha</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      />

      <TouchableOpacity
        onPress={() => router.push('/(professor)/alunos/convidar')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        style={{ backgroundColor: theme.cor_primaria }}
      >
        <Text className="text-3xl font-bold text-white">+</Text>
      </TouchableOpacity>
    </View>
  );
}

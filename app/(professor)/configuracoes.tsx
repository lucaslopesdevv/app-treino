import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { PLANS } from '../../lib/plans';

type StatusBadgeProps = { status: string | null };

function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    trial: { label: 'Trial gratuito', bg: 'bg-slate-700', fg: 'text-slate-200' },
    ativo: { label: 'Ativo', bg: 'bg-green-700', fg: 'text-white' },
    vencido: { label: 'Vencido', bg: 'bg-red-700', fg: 'text-white' },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-700', fg: 'text-slate-300' },
  };
  const c = map[status] ?? map.cancelado;
  return (
    <View className={`self-start rounded-full px-3 py-1 ${c.bg}`}>
      <Text className={`text-xs font-semibold ${c.fg}`}>{c.label}</Text>
    </View>
  );
}

export default function Configuracoes() {
  const router = useRouter();
  const { profile } = useAuth();
  const sub = useSubscription(profile?.gym_id);

  useFocusEffect(
    useCallback(() => {
      sub.refresh();
    }, [sub.refresh]),
  );

  const planoNome =
    PLANS.find((p) => p.id === sub.plano)?.nome ?? sub.plano ?? '—';
  const progresso = sub.alunosLimite
    ? Math.min(100, (sub.alunosAtivos / sub.alunosLimite) * 100)
    : 0;

  return (
    <View className="flex-1 bg-slate-900">
      {sub.status === 'vencido' && (
        <View className="bg-red-700 px-4 py-3">
          <Text className="text-center text-sm font-semibold text-white">
            Assinatura vencida — cadastro de novos alunos bloqueado
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View>
          <Text className="mb-2 text-sm font-semibold uppercase text-slate-400">
            Meu plano
          </Text>
          <View className="rounded-xl bg-slate-800 p-4">
            {sub.loading ? (
              <ActivityIndicator color="#fff" />
            ) : sub.error ? (
              <View>
                <Text className="text-red-400">{sub.error}</Text>
                <TouchableOpacity
                  onPress={sub.refresh}
                  className="mt-3 self-start rounded-lg bg-slate-700 px-3 py-2"
                >
                  <Text className="text-white">Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-white">
                    {planoNome}
                  </Text>
                  <StatusBadge status={sub.status} />
                </View>

                <Text className="mt-3 text-sm text-slate-300">
                  {sub.alunosAtivos} de {sub.alunosLimite} alunos ativos este
                  mês
                </Text>
                <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                  <View
                    className={`h-full ${
                      progresso >= 90 ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progresso}%` }}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/(professor)/assinatura/planos')}
                  className="mt-4 items-center rounded-xl bg-blue-600 py-3"
                >
                  <Text className="font-semibold text-white">
                    Gerenciar plano
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold uppercase text-slate-400">
            Conta
          </Text>
          <View className="rounded-xl bg-slate-800 p-4">
            <Text className="text-sm text-slate-300">
              {profile?.nome ?? 'Professor'}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              Use o botão "Sair" no canto superior direito para encerrar a
              sessão.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

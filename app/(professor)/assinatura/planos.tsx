import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSubscription } from '../../../hooks/useSubscription';
import { useTheme } from '../../../hooks/useTheme';
import { PLANS, type PlanId } from '../../../lib/plans';

type CheckoutResponse = {
  payment_url: string | null;
  subscription_id?: string;
};

export default function Planos() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const sub = useSubscription(profile?.gym_id);
  const [pending, setPending] = useState<PlanId | null>(null);

  async function assinar(planoId: PlanId) {
    if (!profile?.gym_id) return;
    setPending(planoId);
    const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
      'create-checkout',
      { body: { gym_id: profile.gym_id, plano_id: planoId } },
    );
    setPending(null);
    if (error || !data) {
      Alert.alert(
        'Erro',
        error?.message ?? 'Não foi possível iniciar o checkout.',
      );
      return;
    }
    if (!data.payment_url) {
      Alert.alert(
        'Assinatura criada',
        'A cobrança foi gerada, mas o link de pagamento ainda não está disponível. Tente novamente em alguns instantes.',
      );
      await sub.refresh();
      return;
    }
    await WebBrowser.openBrowserAsync(data.payment_url);
    await sub.refresh();
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-900"
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text className="text-2xl font-bold text-white">Escolha um plano</Text>
      <Text className="text-sm text-slate-400">
        Cobrado mensalmente. Você pode trocar de plano a qualquer momento.
      </Text>

      {PLANS.map((p) => {
        const atual = sub.plano === p.id && sub.status === 'ativo';
        const isPending = pending === p.id;
        return (
          <View
            key={p.id}
            className="rounded-xl border p-4"
            style={{
              borderColor: atual ? theme.cor_primaria : '#334155',
              backgroundColor: atual ? '#1e1b4b' : '#1e293b',
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-white">{p.nome}</Text>
              {atual && (
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: theme.cor_primaria }}
                >
                  <Text className="text-xs font-semibold text-white">
                    Plano atual
                  </Text>
                </View>
              )}
            </View>

            <Text
              className="mt-1 text-base"
              style={{ color: theme.cor_primaria }}
            >
              {p.preco_display}
            </Text>
            <Text className="mt-2 text-sm text-slate-300">
              Até{' '}
              {p.alunos_limite >= 999999
                ? 'ilimitados'
                : `${p.alunos_limite}`}{' '}
              alunos ativos
            </Text>
            <Text className="mt-1 text-xs text-slate-400">{p.descricao}</Text>

            <TouchableOpacity
              disabled={atual || isPending}
              onPress={() => assinar(p.id)}
              className={`mt-4 items-center rounded-xl py-3 ${
                isPending ? 'opacity-60' : ''
              }`}
              style={{
                backgroundColor: atual ? '#334155' : theme.cor_primaria,
              }}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">
                  {atual ? 'Plano atual' : 'Assinar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      <Text className="mt-4 text-center text-xs text-slate-500">
        Após o pagamento, volte para o app — o status atualiza automaticamente.
      </Text>
    </ScrollView>
  );
}

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSubscription } from '../../../hooks/useSubscription';
import { PLANS } from '../../../lib/plans';

export default function Convidar() {
  const router = useRouter();
  const { profile } = useAuth();
  const sub = useSubscription(profile?.gym_id);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviadoPara, setEnviadoPara] = useState<{
    nome: string;
    email: string;
  } | null>(null);

  const planoNome =
    PLANS.find((p) => p.id === sub.plano)?.nome ?? sub.plano ?? 'atual';

  if (sub.loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (sub.error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <Text className="text-center text-red-400">{sub.error}</Text>
        <TouchableOpacity
          onPress={sub.refresh}
          className="mt-4 rounded-xl bg-slate-700 px-4 py-2"
        >
          <Text className="text-white">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!sub.podeCadastrar) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <View className="w-full rounded-2xl border border-red-700 bg-slate-800 p-6">
          <Text className="text-center text-lg font-bold text-white">
            Limite atingido
          </Text>
          <Text className="mt-3 text-center text-base text-slate-300">
            Você atingiu o limite de{' '}
            <Text className="font-semibold text-white">
              {sub.alunosLimite} alunos
            </Text>{' '}
            do plano{' '}
            <Text className="font-semibold text-white">{planoNome}</Text>.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(professor)/assinatura/planos')}
            className="mt-6 items-center rounded-xl bg-blue-600 py-3"
          >
            <Text className="font-semibold text-white">Fazer upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function enviar() {
    setErro(null);
    if (!nome.trim() || !email.trim()) {
      setErro('Preencha nome e e-mail.');
      return;
    }
    if (!profile?.gym_id) return;
    setEnviando(true);
    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      error?: string;
    }>('invite-aluno', {
      body: { gym_id: profile.gym_id, nome: nomeTrim, email: emailTrim },
    });
    setEnviando(false);

    if (error || !data?.ok) {
      const msg =
        (data as { error?: string } | null)?.error ??
        error?.message ??
        'Não foi possível enviar o convite.';
      setErro(msg);
      return;
    }

    setEnviadoPara({ nome: nomeTrim, email: emailTrim });
    sub.refresh();
  }

  function convidarOutro() {
    setNome('');
    setEmail('');
    setErro(null);
    setEnviadoPara(null);
  }

  if (enviadoPara) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <View className="w-full rounded-2xl border border-green-700 bg-slate-800 p-6">
          <Text className="text-center text-2xl font-bold text-white">
            ✓ Convite enviado
          </Text>
          <Text className="mt-3 text-center text-base text-slate-200">
            Para{' '}
            <Text className="font-semibold text-white">
              {enviadoPara.email}
            </Text>
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-400">
            {enviadoPara.nome} receberá um e-mail para definir a senha e
            entrar no app.
          </Text>

          <TouchableOpacity
            onPress={convidarOutro}
            className="mt-6 items-center rounded-xl bg-blue-600 py-3"
          >
            <Text className="font-semibold text-white">
              Convidar outro aluno
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-2 items-center rounded-xl bg-slate-700 py-3"
          >
            <Text className="font-semibold text-white">Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-2xl font-bold text-white">Convidar aluno</Text>
        <Text className="text-xs text-slate-400">
          {sub.alunosAtivos} de {sub.alunosLimite} alunos ativos este mês
        </Text>

        <Text className="mt-3 text-sm text-slate-300">Nome</Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Nome do aluno"
          placeholderTextColor="#64748b"
          editable={!enviando}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white"
        />

        <Text className="text-sm text-slate-300">E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!enviando}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-white"
        />

        {erro && (
          <Text className="text-center text-sm text-red-400">{erro}</Text>
        )}

        <TouchableOpacity
          onPress={enviar}
          disabled={enviando}
          className={`mt-3 items-center rounded-xl bg-blue-600 py-3.5 ${
            enviando ? 'opacity-60' : ''
          }`}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Enviar convite
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

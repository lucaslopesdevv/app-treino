import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

function traduzErroSenha(message: string): string {
  if (message.toLowerCase().includes('password'))
    return 'A senha não atende aos requisitos. Tente outra com pelo menos 6 caracteres.';
  if (message.toLowerCase().includes('token'))
    return 'Link expirado ou inválido. Peça um novo convite ao seu professor.';
  return 'Não foi possível definir a senha. Tente novamente.';
}

export default function DefinirSenha() {
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
  }>();
  const router = useRouter();
  const isRecovery = params.type === 'recovery';
  const titulo = isRecovery ? 'Redefinir senha' : 'Bem-vindo! Defina sua senha';
  const subtitulo = isRecovery
    ? 'Crie uma nova senha para sua conta.'
    : 'Crie uma senha para acessar o app.';

  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [preparando, setPreparando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    if (!access_token || !refresh_token) {
      setErro('Link inválido. Abra o e-mail de convite no celular para entrar.');
      setPreparando(false);
      return;
    }
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setErro(traduzErroSenha(error.message));
        }
        setPreparando(false);
      });
  }, [params.access_token, params.refresh_token]);

  async function salvar() {
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirma) {
      setErro('As senhas não coincidem.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { data: updated, error } = await supabase.auth.updateUser({
      password: senha,
    });
    if (error) {
      setSalvando(false);
      setErro(traduzErroSenha(error.message));
      return;
    }
    // Redireciona pra área certa baseado no role do profile.
    const userId = updated.user?.id;
    if (userId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      const role = (prof as { role?: string } | null)?.role;
      router.replace(role === 'professor' ? '/(professor)' : '/(aluno)');
    } else {
      router.replace('/(aluno)');
    }
    setSalvando(false);
  }

  if (preparando) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-slate-900 px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="gap-3 rounded-2xl bg-slate-800 p-6">
        <Text className="text-center text-2xl font-bold text-white">
          {titulo}
        </Text>
        <Text className="mb-4 text-center text-slate-300">{subtitulo}</Text>

        <Text className="text-sm text-slate-300">Nova senha</Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="mín. 6 caracteres"
          placeholderTextColor="#94a3b8"
          editable={!salvando}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />

        <Text className="mt-2 text-sm text-slate-300">Confirmar senha</Text>
        <TextInput
          value={confirma}
          onChangeText={setConfirma}
          secureTextEntry
          placeholder="repita a senha"
          placeholderTextColor="#94a3b8"
          editable={!salvando}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />

        {erro && (
          <Text className="text-center text-sm text-red-400">{erro}</Text>
        )}

        <TouchableOpacity
          onPress={salvar}
          disabled={salvando}
          className={`mt-3 items-center rounded-xl bg-blue-600 py-3.5 ${
            salvando ? 'opacity-60' : ''
          }`}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Definir senha e entrar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

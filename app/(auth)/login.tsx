import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { GymLogo } from '../../components/GymLogo';
import { ThemedButton } from '../../components/ThemedButton';
import { useTheme } from '../../hooks/useTheme';

function traduzErro(message: string): string {
  if (message.includes('Invalid login credentials'))
    return 'E-mail ou senha inválidos.';
  if (message.includes('Email not confirmed'))
    return 'Confirme seu e-mail antes de entrar.';
  if (message.toLowerCase().includes('network'))
    return 'Sem conexão. Verifique sua internet.';
  return 'Não foi possível entrar. Tente novamente.';
}

export default function Login() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    if (!email || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setErro(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setLoading(false);
    if (error) setErro(traduzErro(error.message));
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-slate-900 px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="mb-6 items-center">
        <GymLogo size="lg" />
      </View>

      <View className="gap-3 rounded-2xl bg-slate-800 p-6">
        <Text className="text-center text-3xl font-bold text-white">
          FitFlow
        </Text>
        <Text className="mb-4 text-center text-slate-300">
          Entre com sua conta
        </Text>

        <TextInput
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          placeholder="E-mail"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          placeholder="Senha"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
          editable={!loading}
        />

        {erro && (
          <Text className="text-center text-sm text-red-400">{erro}</Text>
        )}

        <ThemedButton
          title="Entrar"
          onPress={entrar}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        <Link href="/(auth)/esqueci-senha" asChild>
          <TouchableOpacity className="mt-2 self-end py-1">
            <Text
              className="text-xs"
              style={{ color: theme.cor_primaria }}
            >
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

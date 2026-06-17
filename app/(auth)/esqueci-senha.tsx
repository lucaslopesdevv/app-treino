// SETUP NECESSÁRIO NO SUPABASE DASHBOARD:
// Authentication → URL Configuration → Redirect URLs
// Adicionar: https://portfolio-lucas-lopes-dev.vercel.app/auth-redirect
// (a página Vercel converte o hash em query e dispara apptreino://)

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';

const COOLDOWN_SECONDS = 60;

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup do interval ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startCountdown() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCountdown(COOLDOWN_SECONDS);
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function enviar() {
    // Guard contra duplo toque, request em andamento ou cooldown ativo.
    if (enviando || countdown > 0) return;

    setErro(null);
    if (!email.trim()) {
      setErro('Informe seu e-mail.');
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            'https://portfolio-lucas-lopes-dev.vercel.app/auth-redirect',
        },
      );
      if (error) {
        if (
          error.message.toLowerCase().includes('rate') ||
          error.message.includes('429')
        ) {
          setErro(
            'Muitas tentativas. Aguarde alguns instantes antes de tentar de novo.',
          );
        } else {
          setErro('Não foi possível enviar agora. Tente novamente.');
        }
        return;
      }
      setEnviado(true);
      startCountdown();
    } catch {
      setErro('Sem conexão. Tente novamente em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  const bloqueado = enviando || countdown > 0;

  if (enviado) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <View className="w-full gap-3 rounded-2xl bg-slate-800 p-6">
          <Text className="text-center text-2xl font-bold text-white">
            Verifique seu e-mail
          </Text>
          <Text className="text-center text-base text-slate-300">
            Se este e-mail estiver cadastrado, você receberá um link em
            instantes. Verifique sua caixa de entrada.
          </Text>

          {erro && (
            <Text className="text-center text-sm text-red-400">{erro}</Text>
          )}

          <TouchableOpacity
            onPress={enviar}
            disabled={bloqueado}
            className={`mt-3 items-center rounded-xl bg-slate-700 py-3 ${
              bloqueado ? 'opacity-60' : ''
            }`}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">
                {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar link'}
              </Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity className="items-center rounded-xl bg-blue-600 py-3">
              <Text className="font-semibold text-white">Voltar ao login</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
          Recuperar senha
        </Text>
        <Text className="mb-4 text-center text-slate-300">
          Vamos enviar um link para você criar uma nova senha.
        </Text>

        <Text className="text-sm text-slate-300">E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          editable={!bloqueado}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />

        {erro && (
          <Text className="text-center text-sm text-red-400">{erro}</Text>
        )}

        <TouchableOpacity
          onPress={enviar}
          disabled={bloqueado}
          className={`mt-3 items-center rounded-xl bg-blue-600 py-3.5 ${
            bloqueado ? 'opacity-60' : ''
          }`}
        >
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {countdown > 0
                ? `Aguarde ${countdown}s`
                : 'Enviar link de recuperação'}
            </Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="mt-2 items-center py-2">
            <Text className="text-sm text-blue-400">Voltar ao login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

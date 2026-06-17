import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ThemeProvider } from '../context/ThemeContext';

/**
 * Magic links do Supabase chegam como:
 *   apptreino://#access_token=...&refresh_token=...&type=invite
 * Os tokens ficam no fragmento (#), não no query (?). Esta função aceita
 * ambos pra ser robusta.
 */
function extractAuthTokens(url: string): {
  access_token?: string;
  refresh_token?: string;
  type?: string;
} {
  const idxHash = url.indexOf('#');
  const idxQ = url.indexOf('?');
  const start = Math.min(
    idxHash === -1 ? Infinity : idxHash,
    idxQ === -1 ? Infinity : idxQ,
  );
  if (start === Infinity) return {};
  const tail = url
    .slice(start + 1)
    .replace(/^#/, '')
    .replace(/^\?/, '');
  const params = new URLSearchParams(tail);
  return {
    access_token: params.get('access_token') ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    type: params.get('type') ?? undefined,
  };
}

function RouteGuard() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Captura tokens do deep link e desvia para a tela de definição de senha.
  useEffect(() => {
    function handleUrl(url: string | null | undefined) {
      if (!url) return;
      const { access_token, refresh_token, type } = extractAuthTokens(url);
      if (access_token && refresh_token) {
        router.replace({
          pathname: '/(auth)/definir-senha',
          params: {
            access_token,
            refresh_token,
            type: type ?? 'recovery',
          },
        });
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
    // Array vazio: registramos o listener uma única vez. router é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;

    const group = segments[0] as string | undefined;
    const inAuth = group === '(auth)';
    const onDefinirSenha =
      inAuth && (segments as string[])[1] === 'definir-senha';

    // Nunca tira o usuário da tela de definir senha — ele acabou de
    // setSession via deep link e ainda precisa cadastrar uma senha.
    if (onDefinirSenha) return;

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && profile) {
      const target = profile.role === 'professor' ? '/(professor)' : '/(aluno)';
      if (inAuth || !group) router.replace(target);
    }
  }, [loading, session, profile, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <RouteGuard />
      </ThemeProvider>
    </AuthProvider>
  );
}

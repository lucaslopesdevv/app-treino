import { Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function AlunoLayout() {
  const { signOut } = useAuth();
  const { theme } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.cor_primaria,
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity onPress={signOut} className="px-4">
            <Text
              className="font-semibold"
              style={{ color: theme.cor_primaria }}
            >
              Sair
            </Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Meu Treino' }} />
      <Tabs.Screen name="historico" options={{ title: 'Histórico' }} />
      <Tabs.Screen
        name="execucao/[dia]"
        options={{ href: null, title: 'Execução' }}
      />
      <Tabs.Screen
        name="evolucao/[exerciseId]"
        options={{ href: null, title: 'Evolução' }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

export default function ProfessorLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Alunos' }} />
      <Tabs.Screen name="modelos/index" options={{ title: 'Modelos' }} />
      <Tabs.Screen
        name="configuracoes/index"
        options={{ title: 'Config' }}
      />
      <Tabs.Screen
        name="configuracoes/tema"
        options={{ href: null, title: 'Personalizar' }}
      />
      <Tabs.Screen name="modelos/[id]" options={{ href: null, title: 'Modelo' }} />
      <Tabs.Screen name="alunos/[id]" options={{ href: null, title: 'Ficha do aluno' }} />
      <Tabs.Screen
        name="alunos/convidar"
        options={{ href: null, title: 'Convidar aluno' }}
      />
      <Tabs.Screen
        name="assinatura/planos"
        options={{ href: null, title: 'Planos' }}
      />
    </Tabs>
  );
}

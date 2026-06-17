import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_THEME, getThemeById, type Theme } from '../lib/themes';
import { useAuth } from '../hooks/useAuth';

export type GymRow = {
  id: string;
  nome: string;
  logo_url: string | null;
  tema: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
};

export interface ThemeContextValue {
  theme: Theme;
  logoUrl: string | null;
  gymNome: string | null;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  logoUrl: null,
  gymNome: null,
  isLoading: false,
  refreshTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const gymId = profile?.gym_id ?? null;

  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gymNome, setGymNome] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFor = useCallback(async (id: string | null) => {
    if (!id) {
      setTheme(DEFAULT_THEME);
      setLogoUrl(null);
      setGymNome(null);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('gyms')
      .select('id, nome, logo_url, tema, cor_primaria, cor_secundaria')
      .eq('id', id)
      .maybeSingle();
    const row = data as GymRow | null;
    if (row) {
      const base = getThemeById(row.tema);
      // Permite override de cores no banco mantendo o id do tema
      setTheme({
        ...base,
        cor_primaria: row.cor_primaria || base.cor_primaria,
        cor_secundaria: row.cor_secundaria || base.cor_secundaria,
      });
      setLogoUrl(row.logo_url);
      setGymNome(row.nome);
    } else {
      setTheme(DEFAULT_THEME);
      setLogoUrl(null);
      setGymNome(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFor(gymId);
  }, [gymId, loadFor]);

  const refreshTheme = useCallback(async () => {
    await loadFor(gymId);
  }, [gymId, loadFor]);

  return (
    <ThemeContext.Provider
      value={{ theme, logoUrl, gymNome, isLoading, refreshTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

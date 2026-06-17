export type ThemeId =
  | 'roxo'
  | 'azul'
  | 'verde'
  | 'laranja'
  | 'vermelho'
  | 'rosa'
  | 'ciano'
  | 'amarelo'
  | 'cinza'
  | 'preto';

export interface Theme {
  id: ThemeId;
  nome: string;
  cor_primaria: string;
  cor_secundaria: string;
  emoji: string;
}

export const THEMES: Theme[] = [
  { id: 'roxo',     nome: 'Roxo',     cor_primaria: '#6366f1', cor_secundaria: '#4f46e5', emoji: '🟣' },
  { id: 'azul',     nome: 'Azul',     cor_primaria: '#3b82f6', cor_secundaria: '#2563eb', emoji: '🔵' },
  { id: 'verde',    nome: 'Verde',    cor_primaria: '#22c55e', cor_secundaria: '#16a34a', emoji: '🟢' },
  { id: 'laranja',  nome: 'Laranja',  cor_primaria: '#f97316', cor_secundaria: '#ea580c', emoji: '🟠' },
  { id: 'vermelho', nome: 'Vermelho', cor_primaria: '#ef4444', cor_secundaria: '#dc2626', emoji: '🔴' },
  { id: 'rosa',     nome: 'Rosa',     cor_primaria: '#ec4899', cor_secundaria: '#db2777', emoji: '🩷' },
  { id: 'ciano',    nome: 'Ciano',    cor_primaria: '#06b6d4', cor_secundaria: '#0891b2', emoji: '🩵' },
  { id: 'amarelo',  nome: 'Amarelo',  cor_primaria: '#eab308', cor_secundaria: '#ca8a04', emoji: '🟡' },
  { id: 'cinza',    nome: 'Cinza',    cor_primaria: '#6b7280', cor_secundaria: '#4b5563', emoji: '⚫' },
  { id: 'preto',    nome: 'Preto',    cor_primaria: '#111827', cor_secundaria: '#030712', emoji: '🖤' },
];

export const DEFAULT_THEME: Theme = THEMES[0];

export function getThemeById(id: string | null | undefined): Theme {
  if (!id) return DEFAULT_THEME;
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

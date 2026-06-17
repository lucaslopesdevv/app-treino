export const PLANS = [
  {
    id: 'starter',
    nome: 'Starter',
    alunos_limite: 30,
    preco_centavos: 4900,
    preco_display: 'R$ 49/mês',
    descricao: 'Ideal para personal trainer autônomo',
  },
  {
    id: 'grow',
    nome: 'Grow',
    alunos_limite: 100,
    preco_centavos: 9900,
    preco_display: 'R$ 99/mês',
    descricao: 'Para academias pequenas',
  },
  {
    id: 'pro',
    nome: 'Pro',
    alunos_limite: 300,
    preco_centavos: 17900,
    preco_display: 'R$ 179/mês',
    descricao: 'Para academias em crescimento',
  },
  {
    id: 'ilimitado',
    nome: 'Ilimitado',
    alunos_limite: 999999,
    preco_centavos: 29900,
    preco_display: 'R$ 299/mês',
    descricao: 'Sem limite de alunos',
  },
] as const;

export type PlanId = (typeof PLANS)[number]['id'];
export type Plan = (typeof PLANS)[number];

export function getPlan(id: PlanId): Plan {
  const found = PLANS.find((p) => p.id === id);
  if (!found) throw new Error(`Plano desconhecido: ${id}`);
  return found;
}

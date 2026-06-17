// Mantém em sincronia com app/lib/plans.ts
export const PLANS = [
  { id: 'starter',   nome: 'Starter',   alunos_limite: 30,     preco_centavos: 4900 },
  { id: 'grow',      nome: 'Grow',      alunos_limite: 100,    preco_centavos: 9900 },
  { id: 'pro',       nome: 'Pro',       alunos_limite: 300,    preco_centavos: 17900 },
  { id: 'ilimitado', nome: 'Ilimitado', alunos_limite: 999999, preco_centavos: 29900 },
] as const;

export type PlanId = typeof PLANS[number]['id'];

export function getPlan(id: string) {
  return PLANS.find((p) => p.id === id);
}

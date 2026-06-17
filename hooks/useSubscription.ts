import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SubscriptionStatus = 'trial' | 'ativo' | 'vencido' | 'cancelado';

type CheckResponse = {
  pode_cadastrar: boolean;
  alunos_ativos: number;
  alunos_limite: number;
  plano: string;
  status: SubscriptionStatus;
};

type State = {
  loading: boolean;
  error: string | null;
  podeCadastrar: boolean;
  alunosAtivos: number;
  alunosLimite: number;
  plano: string;
  status: SubscriptionStatus | null;
};

const INITIAL: State = {
  loading: true,
  error: null,
  podeCadastrar: false,
  alunosAtivos: 0,
  alunosLimite: 0,
  plano: '',
  status: null,
};

export function useSubscription(gymId: string | null | undefined) {
  const [state, setState] = useState<State>(INITIAL);

  const load = useCallback(async () => {
    if (!gymId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase.functions.invoke<CheckResponse>(
      'check-alunos-limit',
      { body: { gym_id: gymId } },
    );
    if (error || !data) {
      setState((s) => ({
        ...s,
        loading: false,
        error: error?.message ?? 'Erro ao verificar assinatura',
      }));
      return;
    }
    setState({
      loading: false,
      error: null,
      podeCadastrar: data.pode_cadastrar,
      alunosAtivos: data.alunos_ativos,
      alunosLimite: data.alunos_limite,
      plano: data.plano,
      status: data.status,
    });
  }, [gymId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

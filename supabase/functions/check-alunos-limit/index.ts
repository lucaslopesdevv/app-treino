// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: 'unauthorized' }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const gymId: string | undefined = body.gym_id;
    if (!gymId) return json({ error: 'missing gym_id' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: profile } = await admin
      .from('profiles')
      .select('role, gym_id')
      .eq('id', userId)
      .single();
    if (
      !profile ||
      (profile as any).role !== 'professor' ||
      (profile as any).gym_id !== gymId
    ) {
      return json({ error: 'forbidden' }, 403);
    }

    const { data: subRow } = await admin
      .from('gym_subscriptions')
      .select('*')
      .eq('gym_id', gymId)
      .maybeSingle();
    const sub = subRow as any;
    if (!sub) return json({ error: 'subscription not found' }, 404);

    const limiteEfetivo: number =
      sub.plano_customizado && sub.alunos_limite_custom != null
        ? sub.alunos_limite_custom
        : sub.alunos_limite;

    const { data: ativosRow } = await admin
      .from('vw_alunos_ativos')
      .select('total')
      .eq('gym_id', gymId)
      .maybeSingle();
    const alunosAtivos: number = (ativosRow as any)?.total ?? 0;

    const isTrial = sub.status === 'trial';
    const podeCadastrar = isTrial || alunosAtivos < limiteEfetivo;

    return json({
      pode_cadastrar: podeCadastrar,
      alunos_ativos: alunosAtivos,
      alunos_limite: limiteEfetivo,
      plano: sub.plano,
      status: sub.status,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

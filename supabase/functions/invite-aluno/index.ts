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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
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
    const callerId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const gymId: string | undefined = body.gym_id;
    const nome: string | undefined = body.nome?.trim();
    const email: string | undefined = body.email?.trim().toLowerCase();

    if (!gymId || !nome || !email) {
      return json({ error: 'missing gym_id, nome or email' }, 400);
    }
    if (!isValidEmail(email)) {
      return json({ error: 'e-mail inválido' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Valida que quem chama é professor desta academia
    const { data: profile } = await admin
      .from('profiles')
      .select('role, gym_id')
      .eq('id', callerId)
      .single();
    if (
      !profile ||
      (profile as any).role !== 'professor' ||
      (profile as any).gym_id !== gymId
    ) {
      return json({ error: 'forbidden' }, 403);
    }

    // 2. Checa limite efetivo (mesma regra de check-alunos-limit)
    const { data: subRow } = await admin
      .from('gym_subscriptions')
      .select('*')
      .eq('gym_id', gymId)
      .maybeSingle();
    const sub = subRow as any;
    if (!sub) return json({ error: 'subscription not found' }, 404);

    if (sub.status === 'vencido' || sub.status === 'cancelado') {
      return json(
        { error: 'Assinatura vencida — reative o plano para convidar alunos.' },
        402,
      );
    }

    const limiteEfetivo: number =
      sub.plano_customizado && sub.alunos_limite_custom != null
        ? sub.alunos_limite_custom
        : sub.alunos_limite;

    if (sub.status !== 'trial') {
      const { data: ativosRow } = await admin
        .from('vw_alunos_ativos')
        .select('total')
        .eq('gym_id', gymId)
        .maybeSingle();
      const ativos: number = (ativosRow as any)?.total ?? 0;
      if (ativos >= limiteEfetivo) {
        return json(
          {
            error: `Limite de ${limiteEfetivo} alunos do plano atingido.`,
          },
          402,
        );
      }
    }

    // 3. Convida via auth admin (envia magic link)
    const redirectTo = Deno.env.get('APP_DEEP_LINK') ?? 'apptreino://';
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { nome, gym_id: gymId, role: 'aluno' },
        redirectTo,
      });

    if (inviteErr || !invited?.user) {
      const msg = inviteErr?.message ?? 'falha ao convidar';
      if (msg.toLowerCase().includes('already')) {
        return json(
          { error: 'Já existe um usuário com esse e-mail.' },
          409,
        );
      }
      return json({ error: msg }, 500);
    }

    // 4. O trigger on_auth_user_created criou o profile com role='aluno' e
    // nome a partir do raw_user_meta_data. Falta vincular o gym_id.
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ gym_id: gymId, nome })
      .eq('id', invited.user.id);
    if (updateErr) {
      console.error('profile update failed', updateErr);
      return json(
        { error: 'aluno convidado mas falhou ao vincular à academia' },
        500,
      );
    }

    return json({
      ok: true,
      user_id: invited.user.id,
      email,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

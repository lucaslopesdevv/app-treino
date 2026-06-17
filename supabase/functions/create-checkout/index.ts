// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getPlan } from '../_shared/plans.ts';

const ASAAS_BASE = 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      access_token: ASAAS_API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${text}`);
  return data;
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
    const planId: string | undefined = body.plano_id;
    if (!gymId || !planId) {
      return json({ error: 'missing gym_id or plano_id' }, 400);
    }
    const plan = getPlan(planId);
    if (!plan) return json({ error: 'plano inválido' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Valida que o usuário é professor desta academia
    const { data: profile } = await admin
      .from('profiles')
      .select('id, role, gym_id, nome')
      .eq('id', userId)
      .single();
    if (
      !profile ||
      (profile as any).role !== 'professor' ||
      (profile as any).gym_id !== gymId
    ) {
      return json({ error: 'forbidden' }, 403);
    }

    // Pega a academia + assinatura existente
    const { data: gym } = await admin
      .from('gyms')
      .select('id, nome, email')
      .eq('id', gymId)
      .single();
    if (!gym) return json({ error: 'gym not found' }, 404);

    const { data: subRow } = await admin
      .from('gym_subscriptions')
      .select('*')
      .eq('gym_id', gymId)
      .maybeSingle();
    const sub = subRow as any;

    // Cria customer no Asaas se necessário
    let customerId: string | null = sub?.asaas_customer_id ?? null;
    if (!customerId) {
      const customer = await asaas('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: (gym as any).nome,
          email: (gym as any).email ?? userRes.user.email ?? undefined,
          externalReference: gymId,
        }),
      });
      customerId = customer.id;
      await admin
        .from('gym_subscriptions')
        .update({ asaas_customer_id: customerId, atualizado_em: new Date().toISOString() })
        .eq('gym_id', gymId);
    }

    // Cria assinatura recorrente mensal
    const subscription = await asaas('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED',
        cycle: 'MONTHLY',
        value: plan.preco_centavos / 100,
        nextDueDate: tomorrowISO(),
        description: `App Treino — Plano ${plan.nome}`,
        externalReference: gymId,
      }),
    });

    await admin
      .from('gym_subscriptions')
      .update({
        plano: plan.id,
        alunos_limite: plan.alunos_limite,
        asaas_subscription_id: subscription.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq('gym_id', gymId);

    // Pega a primeira cobrança gerada pra retornar o invoiceUrl
    const payments = await asaas(
      `/subscriptions/${subscription.id}/payments?limit=1`,
    );
    const first = payments?.data?.[0];
    const paymentUrl: string | null =
      first?.invoiceUrl ?? subscription?.invoiceUrl ?? null;

    return json({
      subscription_id: subscription.id,
      payment_url: paymentUrl,
    });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

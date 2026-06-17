// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getPlan } from '../_shared/plans.ts';

const WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  const token = req.headers.get('asaas-access-token');
  if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const event: string | undefined = payload?.event;
  if (!event) return json({ error: 'missing event' }, 400);

  // Asaas envia eventos de pagamento com payload.payment e de assinatura com payload.subscription
  const subscriptionId: string | null =
    payload?.payment?.subscription ??
    payload?.subscription?.id ??
    payload?.subscriptionId ??
    null;
  if (!subscriptionId) {
    // Evento sem ligação com assinatura — devolve 200 pra não causar retry infinito
    return json({ ok: true, ignored: true });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: subRow } = await admin
    .from('gym_subscriptions')
    .select('*')
    .eq('asaas_subscription_id', subscriptionId)
    .maybeSingle();
  const sub = subRow as any;
  if (!sub) {
    return json({ ok: true, ignored: true, reason: 'subscription not found' });
  }

  const updates: Record<string, unknown> = {
    atualizado_em: new Date().toISOString(),
  };

  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED': {
      updates.status = 'ativo';
      const plan = getPlan(sub.plano);
      if (plan) updates.alunos_limite = plan.alunos_limite;
      const base =
        payload?.payment?.paymentDate ??
        payload?.payment?.confirmedDate ??
        new Date().toISOString();
      updates.vence_em = addMonths(new Date(base), 1).toISOString();
      break;
    }
    case 'PAYMENT_OVERDUE': {
      updates.status = 'vencido';
      break;
    }
    case 'SUBSCRIPTION_DELETED': {
      updates.status = 'cancelado';
      break;
    }
    default: {
      return json({ ok: true, ignored: true, event });
    }
  }

  const { error } = await admin
    .from('gym_subscriptions')
    .update(updates)
    .eq('id', sub.id);
  if (error) {
    console.error(error);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, event });
});

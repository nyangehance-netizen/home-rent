// Starts a mobile money payment for a reservation.
//
// PAYMENT_MODE=mock    (default) marks the payment as paid straight away. Use while testing.
// PAYMENT_MODE=azampay sends a USSD push to the tenant's phone through AzamPay. AzamPay then calls
//                      the payment-callback function, which marks the payment paid or failed.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   PAYMENT_MODE, AZAMPAY_APP_NAME, AZAMPAY_CLIENT_ID, AZAMPAY_CLIENT_SECRET, AZAMPAY_API_KEY,
//   AZAMPAY_AUTH_URL (default sandbox), AZAMPAY_API_URL (default sandbox)
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDERS: Record<string, string> = {
  mpesa: "Mpesa",
  mixx: "Tigo", // Mixx by Yas (formerly Tigo Pesa)
  airtel: "Airtel",
  halopesa: "Halopesa",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function azampayCheckout(opts: { phone: string; amount: number; provider: string; externalId: string }) {
  const authUrl = Deno.env.get("AZAMPAY_AUTH_URL") ?? "https://authenticator-sandbox.azampay.co.tz";
  const apiUrl = Deno.env.get("AZAMPAY_API_URL") ?? "https://sandbox.azampay.co.tz";

  const tokenRes = await fetch(`${authUrl}/AppRegistration/GenerateToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: Deno.env.get("AZAMPAY_APP_NAME"),
      clientId: Deno.env.get("AZAMPAY_CLIENT_ID"),
      clientSecret: Deno.env.get("AZAMPAY_CLIENT_SECRET"),
    }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const token = tokenJson?.data?.accessToken;
  if (!token) throw new Error("Could not sign in to AzamPay. Check the AzamPay secrets.");

  const res = await fetch(`${apiUrl}/azampay/mno/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-API-Key": Deno.env.get("AZAMPAY_API_KEY") ?? "",
    },
    body: JSON.stringify({
      accountNumber: opts.phone,
      amount: String(opts.amount),
      currency: "TZS",
      externalId: opts.externalId,
      provider: opts.provider,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message ?? "AzamPay did not accept the payment request.");
  }
  return String(body?.transactionId ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return json({ error: "Please sign in again." }, 401);

  let input: { inquiry_id?: string; provider?: string; phone?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const provider = PROVIDERS[input.provider ?? ""];
  const phone = String(input.phone ?? "");
  if (!input.inquiry_id || !provider) return json({ error: "Choose a mobile money provider." }, 400);
  if (!/^255[67]\d{8}$/.test(phone)) return json({ error: "Enter a valid Tanzanian phone number." }, 400);

  const { data: inquiry, error: inqErr } = await admin
    .from("inquiries")
    .select("id, tenant_id, kind, status, listing:listings(rent, status)")
    .eq("id", input.inquiry_id)
    .single();
  if (inqErr || !inquiry) return json({ error: "Reservation not found." }, 404);
  if (inquiry.tenant_id !== user.id || inquiry.kind !== "reservation") return json({ error: "Not allowed." }, 403);
  // deno-lint-ignore no-explicit-any
  const listing = inquiry.listing as any;
  if (!listing || listing.status !== "available") return json({ error: "This property is no longer available." }, 409);

  const amount = Number(listing.rent); // reserve with one month's rent, credited to the advance
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({ inquiry_id: inquiry.id, payer_id: user.id, amount, provider: input.provider, phone })
    .select("id")
    .single();
  if (payErr || !payment) return json({ error: "Could not start the payment." }, 500);

  const mode = Deno.env.get("PAYMENT_MODE") ?? "mock";
  try {
    if (mode === "azampay") {
      const ref = await azampayCheckout({ phone, amount, provider, externalId: payment.id });
      await admin.from("payments").update({ provider_ref: ref || null }).eq("id", payment.id);
      return json({ payment_id: payment.id, status: "pending", amount });
    }
    // Test mode: approve immediately so the whole flow can be tried without real money.
    const ref = "TEST-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    await admin.from("payments").update({ status: "paid", provider_ref: ref }).eq("id", payment.id);
    return json({ payment_id: payment.id, status: "pending", amount, test_mode: true });
  } catch (e) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return json({ error: e instanceof Error ? e.message : "Payment failed." }, 502);
  }
});

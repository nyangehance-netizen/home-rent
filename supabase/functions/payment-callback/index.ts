// Receives AzamPay's payment result and marks the payment paid or failed.
// Register this URL as the callback in your AzamPay merchant portal:
//   https://<project-ref>.supabase.co/functions/v1/payment-callback?secret=<CALLBACK_SECRET>
// Deploy with:  supabase functions deploy payment-callback --no-verify-jwt
// (AzamPay cannot send a Supabase sign-in token; the secret in the URL protects the endpoint.)
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const expected = Deno.env.get("CALLBACK_SECRET");
  if (!expected || url.searchParams.get("secret") !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // AzamPay echoes the externalId we sent (our payment id). Field names differ between AzamPay
  // API versions, so accept the common spellings.
  const paymentId: string | undefined =
    body.utilityref ?? body.utilityRef ?? body.externalreference ?? body.externalId ?? body.additionalProperties?.externalId;
  const statusText = String(body.transactionstatus ?? body.transactionStatus ?? body.status ?? "").toLowerCase();
  if (!paymentId) return new Response("Missing reference", { status: 400 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const status = statusText.includes("success") ? "paid" : "failed";
  const { error } = await admin
    .from("payments")
    .update({ status, provider_ref: body.reference ?? body.fspReferenceId ?? null })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (error) return new Response("Error", { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});

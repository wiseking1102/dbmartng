import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyWebhookSignature } from "@/lib/paystack";

/**
 * Server-authoritative Pro price in NGN.
 *
 * charge.success events carry the amount in kobo; this is compared
 * against the expected server-side amount so a manipulated or
 * mismatched transaction can never activate Pro.
 * (Keep in sync with PRO_PRICE_NGN in /api/paystack/subscription
 *  and PRO_PRICE in /api/payments/manual.)
 */
const PRO_PRICE_NGN = 5000;
const PRO_AMOUNT_KOBO = PRO_PRICE_NGN * 100;

/**
 * Check if a webhook event has already been processed (idempotency).
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data;
}

/**
 * Mark a webhook event as processed.
 */
async function markEventProcessed(eventId: string, eventType: string) {
  const adminClient = createAdminClient();
  await adminClient.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  } as never);
}

/**
 * Handle charge.success event — subscription or ad payment.
 */
async function handleChargeSuccess(data: any) {
  const adminClient = createAdminClient();
  const metadata = data.metadata || {};
  const userId = metadata.userId;
  const vendorId = metadata.vendorId;
  const reference = data.reference;
  const customerEmail = data.customer?.email;
  const amount = data.amount / 100;

  if (!userId) {
    console.warn("Webhook charge.success: no userId in metadata", reference);
    return;
  }

  /*
   * Verify the amount against the server-authoritative Pro price.
   * A mismatched transaction (wrong amount, currency manipulation,
   * or an unrelated payment replaying our metadata) must never
   * activate Pro. The event is still marked processed so Paystack
   * does not retry it indefinitely.
   */
  if (
    typeof data.amount !== "number" ||
    data.amount < PRO_AMOUNT_KOBO ||
    (data.currency && data.currency !== "NGN")
  ) {
    console.warn(
      `Webhook charge.success: amount/currency mismatch for ${reference} — got ${data.amount} ${data.currency || ""}, expected >= ${PRO_AMOUNT_KOBO} NGN. Not activating.`
    );
    await adminClient.from("system_alerts").insert({
      source: "paystack_webhook",
      error_detail: `charge.success amount/currency mismatch: reference ${reference}, amount ${data.amount}, currency ${data.currency || "unknown"} — Pro NOT activated.`,
      severity: "warning",
    } as never);
    return;
  }

  /*
   * Only subscription payments activate Pro — both plan-based and
   * one-time ₦5,000 flows carry type "subscription" in metadata.
   * Ad/banner payments (type "ad") are handled by their own flow.
   */
  const isSubscriptionPayment =
    data.plan || metadata.type === "subscription";

  if (!isSubscriptionPayment) {
    console.log(
      `Webhook charge.success: non-subscription payment ignored (${reference})`
    );
    return;
  }

  /*
   * Resolve the vendor profile id: recent transaction
   * initialization always includes vendorId in metadata, but
   * older payloads may not — resolve it from the database.
   */
  let resolvedVendorId: string | null = vendorId ?? null;

  if (!resolvedVendorId) {
    const { data: vendorRow } = await adminClient
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    resolvedVendorId =
      (vendorRow as unknown as { id: string } | null)?.id ?? null;
  }

  if (!resolvedVendorId) {
    console.warn(
      `Webhook charge.success: no vendor profile for user ${userId} (${reference})`
    );

    await adminClient.from("system_alerts").insert({
      source: "paystack_webhook",
      error_detail: `charge.success could not resolve vendor profile: reference ${reference}, user ${userId} — Pro NOT activated.`,
      severity: "warning",
    } as never);

    return;
  }

  /*
   * Trusted activation — all subscription state changes go through
   * the atomic activate_verified_paystack_payment() function:
   * reference-verified Pro activation with idempotency guarantees.
   * This handler never performs its own multi-step writes.
   */
  const { data: activationData, error: activationError } =
    await adminClient.rpc(
      "activate_verified_paystack_payment",
      {
        p_user_id: userId,
        p_vendor_id: resolvedVendorId,
        p_reference: String(reference),
        p_amount: amount,
        p_currency: "NGN",
        p_customer_code: data.customer?.customer_code ?? null,
        p_plan_code: data.plan?.plan_code ?? null,
        p_subscription_code:
          data.subscription?.subscription_code ?? null,
      }
    );

  if (activationError) {
    console.error(
      "Pro activation failed — Paystack will retry this event:",
      reference,
      activationError
    );

    throw activationError;
  }

  const activation =
    (activationData as unknown as
      | { success?: boolean; error?: string; period_end?: string }
      | null) || null;

  const periodEnd =
    activation?.period_end ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: vendorInfo } = await adminClient
    .from("vendor_profiles")
    .select("business_name, email")
    .eq("id", resolvedVendorId)
    .maybeSingle();

  const vendorProfile =
    (vendorInfo as unknown as
      | { business_name: string; email: string | null }
      | null) || null;

  const vendorEmail = vendorProfile?.email || customerEmail;

  if (vendorEmail && vendorProfile?.business_name) {
    const receipt = emailTemplates.subscriptionReceipt(
      vendorProfile.business_name,
      amount,
      periodEnd
    );

    sendEmail({
      to: vendorEmail,
      subject: receipt.subject,
      html: receipt.html,
    });
  }

  console.log(
    `Pro payment verified and activated for user ${userId} (reference ${reference})`
  );
}

/**
 * Handle subscription.disable event.
 */
async function handleSubscriptionDisable(data: any) {
  const adminClient = createAdminClient();
  const subscriptionCode = data.subscription_code;
  if (!subscriptionCode) return;

  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("id, user_id")
    .eq("paystack_subscription_code", subscriptionCode)
    .single();

  if (!sub) return;

  await adminClient
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as never)
    .eq("id", (sub as unknown as { id: string }).id);

  await adminClient
    .from("vendor_profiles")
    .update({ subscription_status: "free" } as never)
    .eq("user_id", (sub as unknown as { user_id: string }).user_id);

  console.log(`Subscription disabled for user ${(sub as unknown as { user_id: string }).user_id}`);
}

/**
 * Handle invoice.payment_failed.
 */
async function handleInvoicePaymentFailed(data: any) {
  const adminClient = createAdminClient();
  const subscriptionCode = data.subscription?.subscription_code;
  if (!subscriptionCode) return;

  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("id, user_id")
    .eq("paystack_subscription_code", subscriptionCode)
    .single();

  if (!sub) return;

  await adminClient
    .from("subscriptions")
    .update({ status: "payment_failed" } as never)
    .eq("id", (sub as unknown as { id: string }).id);

  await adminClient
    .from("vendor_profiles")
    .update({ subscription_status: "payment_failed" } as never)
    .eq("user_id", (sub as unknown as { user_id: string }).user_id);

  await adminClient.from("system_alerts").insert({
    source: "paystack",
    error_detail: `Payment failed for subscription ${subscriptionCode} (user: ${(sub as unknown as { user_id: string }).user_id})`,
    severity: "warning",
  } as never);

  const { data: vendorInfo } = await (adminClient
    .from("vendor_profiles")
    .select("business_name, email")
    .eq("user_id", (sub as unknown as { user_id: string }).user_id)
    .single() as never) as unknown as { data: { business_name: string; email: string | null } | null };

  if (vendorInfo?.email) {
    const alert = emailTemplates.paymentFailed(vendorInfo.business_name);
    sendEmail({ to: vendorInfo.email, subject: alert.subject, html: alert.html });
  }

  console.log(
    `Payment failed for user ${(sub as unknown as { user_id: string }).user_id} — flagged, awaiting retry`
  );
}

/**
 * Handle invoice.create.
 */
async function handleInvoiceCreate(data: any) {
  const adminClient = createAdminClient();
  const subscriptionCode = data.subscription?.subscription_code;
  if (!subscriptionCode) return;

  const { data: sub } = await adminClient
    .from("subscriptions")
    .select("id, user_id")
    .eq("paystack_subscription_code", subscriptionCode)
    .single();

  if (!sub) return;

  const nextPaymentDate = data.next_payment_date
    ? new Date(data.next_payment_date)
    : null;

  if (nextPaymentDate) {
    await adminClient
      .from("subscriptions")
      .update({
        current_period_end: nextPaymentDate.toISOString(),
        status: "active",
      } as never)
      .eq("id", (sub as unknown as { id: string }).id);
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";

    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Paystack webhook: invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const eventData = event.data;

    const eventId = event.id;
    if (!eventId) {
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    }
    if (await isEventProcessed(eventId)) {
      return NextResponse.json({ status: "already_processed" });
    }

    switch (eventType) {
      case "charge.success":
        await handleChargeSuccess(eventData);
        break;
      case "subscription.create":
        break;
      case "subscription.disable":
        await handleSubscriptionDisable(eventData);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(eventData);
        break;
      case "invoice.create":
        await handleInvoiceCreate(eventData);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    await markEventProcessed(eventId, eventType);

    return NextResponse.json({ status: "processed" });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

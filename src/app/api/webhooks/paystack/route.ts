import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailTemplates } from "@/lib/email";
import { verifyWebhookSignature } from "@/lib/paystack";

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

  const plan = data.plan;
  if (plan) {
    const customerCode = data.customer?.customer_code;
    const subscriptionCode = data.subscription?.subscription_code;

    const { data: existingSub } = await adminClient
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("tier", "pro")
      .maybeSingle();

    const subscriptionData = {
      vendor_id: vendorId,
      user_id: userId,
      paystack_customer_code: customerCode,
      paystack_subscription_code: subscriptionCode,
      paystack_plan_code: plan.plan_code,
      tier: "pro" as const,
      status: "active" as const,
      price_paid: amount,
      currency: "NGN",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    if (existingSub) {
      await adminClient
        .from("subscriptions")
        .update(subscriptionData as never)
        .eq("id", (existingSub as unknown as { id: string }).id);
    } else {
      await adminClient.from("subscriptions").insert(subscriptionData as never);
    }

    await adminClient
      .from("vendor_profiles")
      .update({
        subscription_status: "pro",
        trial_decision_made: true,
        trial_decision: "pro",
      } as never)
      .eq("user_id", userId);

    const { data: vendorInfo } = await (adminClient
      .from("vendor_profiles")
      .select("business_name, email")
      .eq("user_id", userId)
      .single() as never) as unknown as { data: { business_name: string; email: string | null } | null };

    const vendorEmail = vendorInfo?.email || customerEmail;
    if (vendorEmail && vendorInfo?.business_name) {
      const receipt = emailTemplates.subscriptionReceipt(
        vendorInfo.business_name,
        amount,
        subscriptionData.current_period_end
      );
      sendEmail({
        to: vendorEmail,
        subject: receipt.subject,
        html: receipt.html,
      });
    }

    console.log(
      `Subscription activated for user ${userId}: ${subscriptionCode}`
    );
  }
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

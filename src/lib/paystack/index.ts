/**
 * Paystack integration utilities for DBMartNG.
 *
 * Uses Paystack's Plans + Subscriptions API for vendor subscriptions,
 * and one-time charges for ad/sponsorship payments.
 * All payment channels enabled: card, bank, bank_transfer, ussd,
 * mobile_money (OPay, PalmPay, Kuda), qr, apple_pay.
 *
 * Keys are fetched at runtime from `platform_settings` (managed via admin panel)
 * with a fallback to environment variables.
 */

import { getSecretKey, getPublicKey, getWebhookSecret } from "./keys";

const PAYSTACK_API = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface InitializeTransactionParams {
  email: string;
  amount: number; // in kobo (1 NGN = 100 kobo)
  plan?: string;
  channels?: string[];
  reference?: string;
  metadata?: Record<string, unknown>;
}

interface TransactionResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PlanResponse {
  id: number;
  name: string;
  plan_code: string;
  amount: number;
  interval: string;
}

interface SubscriptionResponse {
  id: number;
  subscription_code: string;
  status: string;
  next_payment_date: string;
}

/**
 * All available payment channels for Paystack in Nigeria.
 */
export const ALL_PAYMENT_CHANNELS = [
  "card",
  "bank",
  "bank_transfer",
  "ussd",
  "mobile_money",
  "qr",
  "apple_pay",
] as const;

/**
 * Get authorization headers using the DB-backed secret key.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const secretKey = await getSecretKey();
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Initialize a Paystack transaction (one-time payment or subscription signup).
 */
export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<PaystackResponse<TransactionResponse>> {
  const headers = await authHeaders();
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      plan: params.plan,
      channels: params.channels || ALL_PAYMENT_CHANNELS,
      reference: params.reference,
      metadata: params.metadata,
    }),
  });
  return response.json();
}

/**
 * Create a subscription plan on Paystack.
 */
export async function createPlan(params: {
  name: string;
  amount: number; // in kobo
  interval: "monthly" | "annually" | "quarterly";
  description?: string;
}): Promise<PaystackResponse<PlanResponse>> {
  const headers = await authHeaders();
  const response = await fetch(`${PAYSTACK_API}/plan`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
    }),
  });
  return response.json();
}

/**
 * Create a customer on Paystack.
 */
export async function createCustomer(params: {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}): Promise<PaystackResponse<{ id: number; customer_code: string }>> {
  const headers = await authHeaders();
  const response = await fetch(`${PAYSTACK_API}/customer`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * List active subscriptions for a customer.
 */
export async function listSubscriptions(
  customerCode: string
): Promise<PaystackResponse<SubscriptionResponse[]>> {
  const headers = await authHeaders();
  const response = await fetch(
    `${PAYSTACK_API}/subscription?customer=${customerCode}`,
    { headers }
  );
  return response.json();
}

/**
 * Verify that a Paystack webhook signature is valid.
 * Uses the DB-backed webhook secret (or env var fallback).
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const webhookSecret = await getWebhookSecret();
  if (!webhookSecret) return false;
  const { createHmac } = await import("crypto");
  const hash = createHmac("sha512", webhookSecret)
    .update(body)
    .digest("hex");
  return hash === signature;
}

/**
 * Get the Paystack public key for frontend initialization.
 * Fetches from DB with env var fallback.
 */
export async function getPaystackPublicKey(): Promise<string> {
  const key = await getPublicKey();
  if (!key) {
    throw new Error(
      "Paystack public key is not configured. Add it in Admin → Settings → Paystack Keys."
    );
  }
  return key;
}

/**
 * Format amount from kobo to Naira.
 */
export function fromKobo(amount: number): number {
  return amount / 100;
}

/**
 * Format amount from Naira to kobo.
 */
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}

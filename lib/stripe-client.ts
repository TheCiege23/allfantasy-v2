import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to your local environment and Vercel project settings.`
    );
  }

  return value;
}

export function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-01-28.clover",
  });

  return stripeClient;
}

export function getStripePublishableKey(): string {
  return getRequiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function getStripeWebhookSecret(): string {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}
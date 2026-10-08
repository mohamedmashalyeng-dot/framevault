import { paymentEnv } from "../env";
import { SimulatedProvider } from "./simulated";
import { StripeProvider } from "./stripe";
import type { PaymentProvider, ProviderName } from "./types";

const instances = new Map<ProviderName, PaymentProvider>();

/** Provider used for new checkouts (PAYMENT_PROVIDER). */
export function getActiveProvider(): PaymentProvider {
  return getProvider(paymentEnv().PAYMENT_PROVIDER);
}

/** Provider that created an existing order, for webhooks and refunds. */
export function getProvider(name: ProviderName): PaymentProvider {
  let provider = instances.get(name);
  if (!provider) {
    provider = name === "stripe" ? StripeProvider.fromEnv() : new SimulatedProvider();
    instances.set(name, provider);
  }
  return provider;
}

export type { PaymentProvider, PaymentEvent, ProviderName } from "./types";
export { WebhookVerificationError } from "./types";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { setting } from "@/db/schema";
import { env } from "./env";

const allAccessSchema = z.object({
  enabled: z.boolean(),
  priceCents: z.number().int().min(100).max(10_000_00),
});

export type AllAccessSettings = z.infer<typeof allAccessSchema>;

export const DEFAULT_ALL_ACCESS: AllAccessSettings = { enabled: true, priceCents: 9900 };

export type StoreSettings = {
  currency: string;
  demoPricing: boolean;
  allAccess: AllAccessSettings;
  paymentProvider: "stripe" | "simulated";
};

export async function getAllAccessSettings(): Promise<AllAccessSettings> {
  const [row] = await getDb().select().from(setting).where(eq(setting.key, "all_access"));
  const parsed = allAccessSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_ALL_ACCESS;
}

export async function saveAllAccessSettings(value: AllAccessSettings) {
  const parsed = allAccessSchema.parse(value);
  await getDb()
    .insert(setting)
    .values({ key: "all_access", value: parsed })
    .onConflictDoUpdate({ target: setting.key, set: { value: parsed, updatedAt: new Date() } });
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { STORE_CURRENCY, DEMO_PRICING, PAYMENT_PROVIDER } = env();
  return {
    currency: STORE_CURRENCY,
    demoPricing: DEMO_PRICING,
    allAccess: await getAllAccessSettings(),
    paymentProvider: PAYMENT_PROVIDER,
  };
}

export const PRODUCT_EVENTS = [
  "sample_started",
  "sample_completed",
  "referral_landed",
  "auth_started",
  "essay_creation_started",
  "feedback_completed",
  "question_started",
  "question_answered",
  "feedback_rated",
  "feedback_reason",
  "invite_copied",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];
export type ProductEventValue = string | number | boolean | null;
export type ProductEventProperties = Record<string, ProductEventValue>;

const EVENT_SET = new Set<string>(PRODUCT_EVENTS);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProductEventName(value: unknown): value is ProductEventName {
  return typeof value === "string" && EVENT_SET.has(value);
}

export function isAnonymousId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * Analytics must never become a second essay store. Only a tiny flat object is
 * accepted, with short scalar values. The API applies the same rule even when
 * a caller bypasses the browser helper.
 */
export function sanitizeProductEventProperties(
  value: unknown,
): ProductEventProperties | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 8) return null;

  const clean: ProductEventProperties = {};
  for (const [key, item] of entries) {
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) return null;
    if (
      item !== null &&
      typeof item !== "string" &&
      typeof item !== "number" &&
      typeof item !== "boolean"
    ) {
      return null;
    }
    if (typeof item === "string" && item.length > 500) return null;
    if (typeof item === "number" && !Number.isFinite(item)) return null;
    clean[key] = item;
  }
  return clean;
}

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAnonymousId,
  isProductEventName,
  sanitizeProductEventProperties,
} from "./productEvents";

test("only named funnel events are accepted", () => {
  assert.equal(isProductEventName("sample_started"), true);
  assert.equal(isProductEventName("essay_text"), false);
  assert.equal(isProductEventName(null), false);
});

test("analytics ids must be UUIDs", () => {
  assert.equal(
    isAnonymousId("6c8ac6c2-532d-4d79-922f-058f0bca4e77"),
    true,
  );
  assert.equal(isAnonymousId("someone@example.com"), false);
});

test("event properties stay flat and too small to hold an essay", () => {
  assert.deepEqual(
    sanitizeProductEventProperties({ rating: "yes", spot_count: 3 }),
    { rating: "yes", spot_count: 3 },
  );
  assert.equal(sanitizeProductEventProperties({ nested: { draft: "x" } }), null);
  assert.equal(sanitizeProductEventProperties({ comment: "x".repeat(501) }), null);
  assert.equal(
    sanitizeProductEventProperties(
      Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i])),
    ),
    null,
  );
});

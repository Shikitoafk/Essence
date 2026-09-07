import assert from "node:assert/strict";
import { test } from "node:test";
import { isStrayOAuthCode } from "./middleware";

test("an OAuth code landing on the site root is forwarded", () => {
  const url = new URL("http://localhost:3000/?code=bd89824d-2d8a-4ac1");
  assert.equal(isStrayOAuthCode(url.pathname, url.searchParams), true);
});

test("the callback route handles its own code", () => {
  // Forwarding here would loop the request straight back into itself.
  const url = new URL("http://localhost:3000/auth/callback?code=bd89824d");
  assert.equal(isStrayOAuthCode(url.pathname, url.searchParams), false);
});

test("the landing page without a code is left alone", () => {
  const url = new URL("http://localhost:3000/");
  assert.equal(isStrayOAuthCode(url.pathname, url.searchParams), false);
});

test("a code on any other route is not ours to spend", () => {
  const url = new URL("http://localhost:3000/dashboard?code=bd89824d");
  assert.equal(isStrayOAuthCode(url.pathname, url.searchParams), false);
});

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isAnonymousId,
  isProductEventName,
  sanitizeProductEventProperties,
} from "@/lib/productEvents";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const properties = sanitizeProductEventProperties(record.properties);
  if (
    !isProductEventName(record.event) ||
    !isAnonymousId(record.anonymousId) ||
    properties === null
  ) {
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_product_event", {
    p_event_name: record.event,
    p_anonymous_id: record.anonymousId,
    p_properties: properties,
  });

  // A missed analytics event must never break the product. Logging still makes
  // a missing migration visible to the operator during rollout.
  if (error) {
    console.error("[essence] product event was not recorded:", error.message);
  }
  return new NextResponse(null, { status: 204 });
}

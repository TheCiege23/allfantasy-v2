import { withApiUsage } from "@/lib/telemetry/usage"
import { NextResponse } from "next/server";
import { trackMetaServerEvent } from "@/lib/meta-capi";

export const POST = withApiUsage({ endpoint: "/api/meta/complete-registration", tool: "MetaCompleteRegistration" })(async (req: Request) => {
  try {
    const body = await req.json();
    const {
      event_id,
      email,
      phone,
      fbp,
      fbc,
      test_event_code,
      source_url,
      custom_data,
    } = body ?? {};

    if (!event_id) {
      return NextResponse.json({ ok: false, error: "Missing event_id" }, { status: 400 });
    }

    const result = await trackMetaServerEvent({
      eventName: "CompleteRegistration",
      eventId: event_id,
      email: email || "",
      phone,
      eventSourceUrl: source_url,
      fbp,
      fbc,
      customData: {
        content_name: "Account signup",
        content_category: "Registration",
        ...(custom_data && typeof custom_data === "object" ? custom_data : {}),
      },
      testEventCode: typeof test_event_code === "string" ? test_event_code : null,
      request: req,
      source: "complete_registration_endpoint",
    });

    if (!result.capi.success) {
      console.error("Meta CAPI error:", result.capi.error);
      return NextResponse.json({ ok: false, error: result.capi.error, meta: result.capi.meta }, { status: 500 });
    }

    console.log("Meta CAPI CompleteRegistration sent:", event_id);
    return NextResponse.json({ ok: true, meta: result.capi.meta });
  } catch (e: any) {
    console.error("Meta CAPI error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
})

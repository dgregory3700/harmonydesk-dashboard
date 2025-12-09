import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const subject = String(body.subject ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    const to = Array.isArray(body.to) ? body.to : [];
    const caseId = body.caseId ?? null;

    if (!subject || !messageBody || !to.length) {
      return NextResponse.json(
        { error: "subject, body, and to[] are required" },
        { status: 400 }
      );
    }

    const emailEndpoint =
      process.env.HD_EMAIL_API_URL ||
      "https://api.harmonydesk.ai/email/send";

    const res = await fetch(emailEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body: messageBody,
        to,
        caseId,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "Backend /email/send failed:",
        res.status,
        text || "(no body)"
      );
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 502 }
      );
    }

    const json = await res.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      provider: json.provider ?? "sendgrid",
      sentAt: json.sentAt ?? new Date().toISOString(),
      from: json.from ?? undefined,
      caseId: json.caseId ?? caseId ?? null,
    });
  } catch (err: any) {
    console.error("Error in /api/send-email:", err);
    return NextResponse.json(
      { error: "Server error while sending email" },
      { status: 500 }
    );
  }
}

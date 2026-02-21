import { NextRequest, NextResponse } from "next/server";
import { requireAuthedSupabase } from "@/lib/authServer";

type InvoiceStatus = "Draft" | "Sent" | "For county report";

type Invoice = {
  id: string;
  caseNumber: string;
  matter: string;
  contact: string;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  due: string;
  countyId: string | null;
};

function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    caseNumber: row.case_number,
    matter: row.matter,
    contact: row.contact,
    hours: Number(row.hours ?? 0),
    rate: Number(row.rate ?? 0),
    status: row.status as InvoiceStatus,
    due: row.due ?? "",
    countyId: row.county_id ?? null,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET /api/invoices error:", error);
      return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(mapRowToInvoice));
  } catch (err) {
    console.error("Unexpected GET /api/invoices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthedSupabase();
    if (!auth.ok) return auth.res;

    const { supabase, userEmail } = auth;
    const body = await req.json().catch(() => ({}));

    const caseNumber = String(body.caseNumber ?? "").trim();
    const matter = String(body.matter ?? "").trim();
    const contact = String(body.contact ?? "").trim();
    const hours = Number(body.hours ?? 0);
    const rate = Number(body.rate ?? 0);

    if (!caseNumber || !matter || !contact) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const due =
      typeof body.due === "string" && body.due.trim() ? body.due.trim() : "";

    // countyId: explicit wins, else fallback to user_settings.default_county_id
    let countyId: string | null =
      typeof body.countyId === "string" && body.countyId.trim()
        ? body.countyId.trim()
        : null;

    if (!countyId) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("default_county_id")
        .eq("user_email", userEmail)
        .maybeSingle();

      countyId = settings?.default_county_id ?? null;
    }

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_email: userEmail,
        case_number: caseNumber,
        matter,
        contact,
        hours: Number.isFinite(hours) ? hours : 0,
        rate: Number.isFinite(rate) ? rate : 0,
        status: "Draft",
        due,
        county_id: countyId,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST /api/invoices error:", error);
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    return NextResponse.json(mapRowToInvoice(data), { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/invoices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

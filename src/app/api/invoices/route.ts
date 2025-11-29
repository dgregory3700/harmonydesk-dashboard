import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseServer";

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
};

// NOTE: cookies() is async in recent Next.js
async function getUserEmail() {
  const cookieStore = await cookies();

  // Debug: log everything we see
  const all = cookieStore.getAll();
  console.log("cookies seen in /api/invoices:", all);

  // Try several possible cookie names
  const candidate =
    cookieStore.get("hd_user_email") ||
    cookieStore.get("hd-user-email") ||
    cookieStore.get("user_email") ||
    cookieStore.get("userEmail") ||
    cookieStore.get("email");

  // If we find a cookie, use it
  if (candidate?.value) {
    return candidate.value;
  }

  // Fallback: single-mediator dev account
  return "dev-mediator@harmonydesk.local";
}

// Initial sample invoices (used for first-time seeding per user)
const seedInvoices = [
  {
    caseNumber: "23-2-00123-1",
    matter: "Smith vs. Turner – Mediation",
    contact: "Attorney Reed",
    hours: 3,
    rate: 250,
    status: "Draft" as InvoiceStatus,
    due: "Draft – set due date",
  },
  {
    caseNumber: "24-1-00456-5",
    matter: "Johnson / Lee – Small Claims",
    contact: "Defendant pro se",
    hours: 2,
    rate: 200,
    status: "Sent" as InvoiceStatus,
    due: "Net 30 – 12/15/2025",
  },
  {
    caseNumber: "24-7-00987-9",
    matter: "Anderson / Rivera – DV Protection Order",
    contact: "King County voucher",
    hours: 4.5,
    rate: 150,
    status: "For county report" as InvoiceStatus,
    due: "Included in month-end county report",
  },
];

function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    caseNumber: row.case_number,
    matter: row.matter,
    contact: row.contact,
    hours: Number(row.hours || 0),
    rate: Number(row.rate || 0),
    status: row.status as InvoiceStatus,
    due: row.due,
  };
}

export async function GET(_req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
  
    let { data, error } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("user_email", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json(
        { error: "Failed to load invoices" },
        { status: 500 }
      );
    }

    // If this user has no invoices yet, seed them with the sample 3
    if (!data || data.length === 0) {
      const toInsert = seedInvoices.map((inv) => ({
        user_email: userEmail,
        case_number: inv.caseNumber,
        matter: inv.matter,
        contact: inv.contact,
        hours: inv.hours,
        rate: inv.rate,
        status: inv.status,
        due: inv.due,
      }));

      const { data: seeded, error: seedError } = await supabaseAdmin
        .from("invoices")
        .insert(toInsert)
        .select("*");

      if (seedError) {
        console.error("Supabase seed error:", seedError);
        return NextResponse.json(
          { error: "Failed to seed invoices" },
          { status: 500 }
        );
      }

      data = seeded ?? [];
    }

    const invoices = (data ?? []).map(mapRowToInvoice);
    return NextResponse.json(invoices);
  } catch (err) {
    console.error("Unexpected GET /api/invoices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = await getUserEmail();
    
    const body = await req.json();

    const caseNumber = String(body.caseNumber ?? "").trim();
    const matter = String(body.matter ?? "").trim();
    const contact = String(body.contact ?? "").trim();
    const hours = Number.parseFloat(body.hours ?? "0");
    const rate = Number.parseFloat(body.rate ?? "0");

    if (!caseNumber || !matter || !contact) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_email: userEmail,
        case_number: caseNumber,
        matter,
        contact,
        hours: Number.isNaN(hours) ? 0 : hours,
        rate: Number.isNaN(rate) ? 0 : rate,
        status: "Draft",
        due: "Draft – set due date",
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Supabase POST error:", error);
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    const invoice = mapRowToInvoice(data);
    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    console.error("Unexpected POST /api/invoices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { getSession } from "@/lib/auth";
import { optionLabel } from "@/lib/intake/questions";
import { quoteTotal } from "@/lib/pricing/engine";
import { getSettings, listLeads } from "@/lib/store";
import { STATUS_LABEL } from "@/lib/workflow";

// Voorkomt dat Excel een cel als formule uitvoert (CSV-injectie).
const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "owner") return new Response("Unauthorized", { status: 401 });

  const [leads, settings] = await Promise.all([listLeads(session.company_id), getSettings(session.company_id)]);
  const form = settings.pricing.form;
  const head = [
    "Ontvangen", "Naam", "E-mail", "Telefoon", "Adres", "Postcode", "Plaats", "Status",
    "Prijsindicatie min", "Prijsindicatie max", "Ruimtes", "Oppervlakte", "Woning", "Onbekend bij aanvraag", "Offerte totaal",
  ];
  const rows = leads.map((l) => [
    l.created_at.slice(0, 10), l.customer.name, l.customer.email, l.customer.phone, l.customer.street,
    l.customer.postcode, l.customer.city, STATUS_LABEL[l.status], l.estimate.min, l.estimate.max,
    optionLabel(form, "spaces", l.answers.spaces), optionLabel(form, "area", l.answers.area),
    optionLabel(form, "property", l.answers.property), l.estimate.unknownFactors.join(", "),
    l.quote ? quoteTotal(l.quote.items) : "",
  ]);
  // BOM + puntkomma: opent correct in Nederlandse Excel.
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aanvragen-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

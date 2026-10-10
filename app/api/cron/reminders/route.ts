import { createHmac, timingSafeEqual } from "node:crypto";
import { bookings, KIND_LABEL } from "@/lib/agenda";
import { addDays, dayLong, todayNl } from "@/lib/dates";
import { MAIL_ENABLED, sendMail } from "@/lib/mail";
import { DEFAULT_COMPANY, getLead, getSettings, listLeads, saveLead } from "@/lib/store";

/**
 * Mailt klanten om 16:00 een herinnering voor hun afspraak van morgen.
 *
 * De geplande functie in netlify/functions/reminders.mjs roept dit adres elk uur van de middag aan; alleen de aanroep
 * die in Nederland in het uur van 16:00 valt verstuurt iets (zo klopt het in zomer- en wintertijd). Elke klant krijgt
 * per afspraak één mail. De sleutel is afgeleid van AUTH_SECRET, dus er is geen extra instelling nodig.
 * Handmatig testen kan met &force=1 (dan telt het uur niet).
 */
const expectedKey = () => createHmac("sha256", process.env.AUTH_SECRET ?? "").update("werkly-reminders").digest("hex");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const expected = expectedKey();
  const ok = !!process.env.AUTH_SECRET && key.length === expected.length && timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  if (!MAIL_ENABLED) return Response.json({ sent: 0, reason: "mailen staat uit" });

  const hour = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" }));
  if (hour !== 16 && url.searchParams.get("force") !== "1") return Response.json({ sent: 0, reason: "het is geen 16:00 in Nederland" });

  const day = addDays(todayNl(), 1);
  const [leads, company] = await Promise.all([listLeads(DEFAULT_COMPANY), getSettings(DEFAULT_COMPANY)]);
  let sent = 0;
  for (const b of bookings(leads)) {
    // Bij een installatie van meerdere dagen alleen voor de eerste dag.
    if (b.done || b.appt.date !== day || b.appt.reminded_at || (b.part && b.part.n > 1) || !b.lead.customer.email) continue;
    if (!b.lead.status.endsWith("_planned")) continue;
    const what = KIND_LABEL[b.kind].toLowerCase() === "bezoek" ? "het bezoek" : "de installatie";
    const mailed = await sendMail({
      to: b.lead.customer.email,
      subject: `Herinnering: morgen komt ${company.company_name} bij u langs`,
      intro: `Hallo ${b.lead.customer.name.split(" ")[0]},\n\nEen herinnering: morgen, ${dayLong(b.appt.date)}, om ${b.appt.time} komt ${b.appt.technician === "Eigenaar" ? "onze monteur" : b.appt.technician} bij u langs voor ${what}. Past het toch niet? Bel ons op ${company.phone}.`,
      button: "Bel ons",
      url: `tel:${company.phone.replace(/\s/g, "")}`,
      from: company.company_name,
      replyTo: company.email,
    });
    if (!mailed) continue;
    // Opnieuw ophalen en alleen het tijdstip van de herinnering zetten, zodat we niets anders overschrijven.
    const fresh = await getLead(b.lead.id, DEFAULT_COMPANY);
    const appt = b.kind === "visit" ? fresh?.appointment : fresh?.install_appointment;
    if (fresh && appt) {
      appt.reminded_at = new Date().toISOString();
      fresh.log.push({ at: appt.reminded_at, text: `Herinnering voor ${what} gemaild naar ${fresh.customer.email}` });
      await saveLead(fresh);
    }
    sent++;
  }
  return Response.json({ sent, day });
}

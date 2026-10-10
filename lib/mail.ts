import "server-only";

/**
 * E-mail naar de klant, via Resend (https://resend.com). Staat uit zolang er geen sleutel is ingesteld:
 * dan deelt de eigenaar de link zelf via WhatsApp of e-mail, zoals voorheen.
 *
 * Aanzetten: zet RESEND_API_KEY en MAIL_FROM (bijvoorbeeld "Uw Bedrijf <offerte@uwbedrijf.nl>") in de omgeving.
 * Het afzenderdomein moet bij Resend zijn bevestigd, anders weigert de dienst de mail.
 */
const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM;

export const MAIL_ENABLED = !!(KEY && FROM);

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Verstuurt een eenvoudige mail met één knop. Geeft terug of het gelukt is; een fout breekt de actie niet af. */
export async function sendMail(mail: { to: string; subject: string; intro: string; button: string; url: string; from: string; replyTo?: string }): Promise<boolean> {
  if (!MAIL_ENABLED || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.to)) return false;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#12211f">
<p>${escape(mail.intro).replace(/\n/g, "<br>")}</p>
<p><a href="${escape(mail.url)}" style="display:inline-block;background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(mail.button)}</a></p>
<p style="font-size:13px;color:#5b6b68">Werkt de knop niet? Kopieer deze link: ${escape(mail.url)}</p>
<p>Met vriendelijke groet,<br>${escape(mail.from)}</p>
</div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        html,
        text: `${mail.intro}\n\n${mail.button}: ${mail.url}\n\nMet vriendelijke groet,\n${mail.from}`,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[mail] verzenden mislukt:", res.status);
    return res.ok;
  } catch (e) {
    console.error("[mail] verzenden mislukt:", (e as Error).message);
    return false;
  }
}

/** Het adres van de site, voor links in een mail. */
export async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;
}

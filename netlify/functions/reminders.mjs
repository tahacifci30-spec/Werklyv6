// Geplande functie bij Netlify: roept elk uur tussen 14:00 en 15:00 UTC het herinneringsadres van de site aan.
// Dat is 16:00 in Nederland in de zomer (14:00 UTC) en in de winter (15:00 UTC); de site zelf controleert welk
// van de twee het juiste uur is en verstuurt dan pas. De sleutel is afgeleid van AUTH_SECRET.
import { createHmac } from "node:crypto";

async function reminders() {
  const site = process.env.URL;
  const secret = process.env.AUTH_SECRET;
  if (!site || !secret) return new Response("Niet ingesteld", { status: 500 });
  const key = createHmac("sha256", secret).update("werkly-reminders").digest("hex");
  const res = await fetch(`${site}/api/cron/reminders?key=${key}`);
  return new Response(await res.text(), { status: res.status });
}

export default reminders;

export const config = { schedule: "0 14,15 * * *" };

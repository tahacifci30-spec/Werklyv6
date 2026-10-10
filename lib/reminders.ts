import { addDays, dayLong, isWeekend, todayNl } from "./dates";
import type { Appointment, Lead } from "./types";

/** De eerstvolgende werkdag na vandaag: op vrijdag is dat maandag. Voor die dag herinnert u uw klanten. */
export function nextWorkday(today = todayNl()) {
  let d = addDays(today, 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

const waDigits = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `31${digits.slice(1)}` : digits;
};

/** WhatsApp-link met het bericht al ingevuld. */
export const whatsapp = (phone: string, text: string) => `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;

const what = (kind: "visit" | "install") => (kind === "visit" ? "het bezoek" : "de installatie");

/** Bevestiging direct na het inplannen. */
export function confirmText(lead: Lead, kind: "visit" | "install", appt: Appointment, company: string) {
  const who = appt.technician === "Eigenaar" ? "Wij komen" : `${appt.technician} komt`;
  return `Hallo ${lead.customer.name.split(" ")[0]}, uw afspraak voor ${what(kind)} staat op ${dayLong(appt.date)} om ${appt.time}. ${who} bij u langs op ${lead.customer.street}. Past het toch niet? Laat het ons weten. Groet, ${company}`;
}

/** Herinnering de werkdag ervoor. */
export function reminderText(lead: Lead, kind: "visit" | "install", appt: Appointment, company: string) {
  return `Hallo ${lead.customer.name.split(" ")[0]}, een herinnering: ${dayLong(appt.date)} om ${appt.time} komen wij bij u langs voor ${what(kind)}. Past het toch niet? Laat het ons weten. Groet, ${company}`;
}

/** Bericht als de afspraak is geannuleerd. */
export function cancelText(lead: Lead, kind: "visit" | "install", appt: Appointment, company: string) {
  return `Hallo ${lead.customer.name.split(" ")[0]}, uw afspraak voor ${what(kind)} op ${dayLong(appt.date)} om ${appt.time} is geannuleerd. Wij bellen u om een nieuw moment af te spreken. Groet, ${company}`;
}

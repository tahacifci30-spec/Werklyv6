import "server-only";
import { OWNER, blocks, overlaps, toMin, worksOn } from "./agenda";
import { addDays, isWeekend, todayNl } from "./dates";
import { getSettings, listAgendaItems, listLeads } from "./store";

/**
 * Kennismakingsgesprekken via de website. De vrije momenten komen uit de agenda van de eigenaar:
 * vaste tijden op zijn werkdagen, min alles wat er al staat. Zo hoeft niemand heen en weer te mailen.
 */
export const CALL_TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
export const CALL_MINUTES = 30;
const DAYS_AHEAD = 21;

export type CallSlots = { date: string; times: string[] }[];

export async function callSlots(companyId: string): Promise<CallSlots> {
  const [leads, items, settings] = await Promise.all([listLeads(companyId), listAgendaItems(companyId), getSettings(companyId)]);
  const bl = blocks(leads, items, settings.team);
  const out: CallSlots = [];
  // Vanaf morgen, zodat er altijd tijd is om het gesprek voor te bereiden.
  for (let i = 1; i <= DAYS_AHEAD && out.length < 10; i++) {
    const date = addDays(todayNl(), i);
    if (isWeekend(date) || !worksOn(settings.team, OWNER, date)) continue;
    const times = CALL_TIMES.filter((t) => !overlaps(bl, OWNER, date, toMin(t), CALL_MINUTES));
    if (times.length) out.push({ date, times });
  }
  return out;
}

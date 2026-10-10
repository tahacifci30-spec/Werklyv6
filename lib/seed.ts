import { addDays, todayNl, workdaysFrom } from "./dates";
import { DEFAULT_COMPANY, emptyCheck, formatInvoiceNumber, newToken } from "./defaults";
import { estimatePrice } from "./pricing/engine";
import type { Customer, Lead, QuoteItem, TechCheck } from "./types";

/** Voorbeeldaanvragen in alle fases, van nieuw tot afgerond en betaald. Alleen voor demo en ontwikkeling. */
const iso = (daysAgo: number, h = 10, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const inDays = (n: number) => addDays(todayNl(), n);

const verified = (over: Partial<Record<keyof Omit<TechCheck, "notes" | "photos" | "completed_at">, string>> = {}): TechCheck => {
  const v = { outdoor_unit: "yes", pipe_distance: "5_10", meter_box: "ok", wall_type: "soft", mounting: "yes", ...over };
  const f = (value: string) => ({ value, source: "verified" as const });
  return {
    outdoor_unit: f(v.outdoor_unit),
    pipe_distance: f(v.pipe_distance),
    meter_box: f(v.meter_box),
    wall_type: f(v.wall_type),
    mounting: f(v.mounting),
    notes: "",
    photos: [],
    completed_at: iso(3, 11),
  };
};

function seedLead(id: string, customer: Customer, answers: Record<string, string>, daysAgo: number): Lead {
  const at = iso(daysAgo);
  return {
    id,
    company_id: DEFAULT_COMPANY,
    created_at: at,
    customer,
    answers,
    estimate: estimatePrice(answers),
    status: "new",
    check: emptyCheck(),
    token: newToken(),
    consent_at: at,
    customer_photos: [],
    notes: [],
    log: [
      { at, text: "Klant heeft het formulier ingevuld" },
      { at, text: "Prijsindicatie berekend" },
    ],
  };
}

const items = (equipment: number, extra: QuoteItem[] = []): QuoteItem[] => [
  { id: "a", label: "Airco-installatie (1 unit)", amount: equipment },
  { id: "b", label: "Montage", amount: 650 },
  ...extra,
];

const std = { spaces: "living", area: "20_30", property: "terraced", outdoor: "facade", existing: "none" };

export function seed(): { leads: Lead[]; invoiceSeq: number } {
  const days = workdaysFrom(inDays(1), 6);
  const out: Lead[] = [];

  // 1. Nieuwe aanvraag met voorkeursdatum
  const jan = seedLead(
    "jan-de-vries",
    { name: "Jan de Vries", email: "jan@example.nl", phone: "06 12345678", postcode: "5141 AB", street: "Kerkstraat 12", city: "Waalwijk" },
    { spaces: "living_bedroom", area: "30_40", property: "terraced", outdoor: "balcony", system: "multisplit" },
    1,
  );
  jan.preferred = { first: { date: days[2], part: "morning" }, second: { date: days[3], part: "any" } };
  out.push(jan);

  // 2. Bezoek vandaag
  const pieter = seedLead(
    "pieter-jansen",
    { name: "Pieter Jansen", email: "pieter@example.nl", phone: "06 87654321", postcode: "5038 CD", street: "Heuvelstraat 48", city: "Tilburg" },
    { spaces: "living", area: "unknown", property: "detached", outdoor: "ground", existing: "none" },
    3,
  );
  pieter.status = "visit_planned";
  pieter.appointment = { date: todayNl(), time: "10:00", technician: "Sven Bakker" };
  pieter.log.push({ at: iso(1, 9, 40), text: "Bezoek ingepland" });
  pieter.notes.push({ at: iso(1, 9, 30), by: "Eigenaar", text: "Klant is overdag alleen na 17:00 bereikbaar. Hond in de tuin." });
  out.push(pieter);

  // 3. Offerte controleren (bezoek is net afgerond)
  const fatima = seedLead(
    "fatima-el-amrani",
    { name: "Fatima El Amrani", email: "fatima@example.nl", phone: "06 11223344", postcode: "5611 EF", street: "Stationsweg 5", city: "Eindhoven" },
    { spaces: "bedroom", area: "20_30", property: "apartment", outdoor: "balcony", existing: "replace" },
    5,
  );
  fatima.status = "quote_review";
  fatima.appointment = { date: inDays(-1), time: "14:30", technician: "Sven Bakker" };
  fatima.check = { ...verified({ wall_type: "hard" }), notes: "Balkon geschikt voor de buitenunit. Boren door beton." };
  fatima.quote = { generated_at: iso(1, 15, 20), items: items(1850, [{ id: "c", label: "Boorwerk harde wand", amount: 120 }]) };
  fatima.log.push({ at: iso(1, 15, 10), text: "Bezoek afgerond door Sven Bakker" }, { at: iso(1, 15, 20), text: "Conceptofferte gemaakt" });
  out.push(fatima);

  // 4. Offerte verstuurd, wacht op klant
  const mark = seedLead(
    "mark-van-dijk",
    { name: "Mark van Dijk", email: "mark@example.nl", phone: "06 55667788", postcode: "5262 GH", street: "Molenweg 101", city: "Vught" },
    { spaces: "multiple", area: "gt40", property: "detached", outdoor: "facade", system: "separate" },
    8,
  );
  mark.status = "quote_sent";
  mark.appointment = { date: inDays(-4), time: "10:00", technician: "Lars Visser" };
  mark.check = verified({ pipe_distance: "10_15" });
  mark.quote = {
    generated_at: iso(4),
    reviewed_at: iso(4, 14),
    sent_at: iso(4, 14),
    items: [
      { id: "q1", label: "Airco-installatie (3 units)", amount: 4750 },
      { id: "q2", label: "Montage", amount: 1950 },
      { id: "q3", label: "Extra leiding (10–15 m)", amount: 150 },
    ],
  };
  mark.log.push({ at: iso(4, 14), text: "Offerte verstuurd" });
  out.push(mark);

  // 5. Akkoord, installatie nog te plannen
  const sanne = seedLead(
    "sanne-peters",
    { name: "Sanne Peters", email: "sanne@example.nl", phone: "06 99887766", postcode: "5071 JK", street: "Lindelaan 9", city: "Udenhout" },
    { ...std, property: "corner" },
    10,
  );
  sanne.status = "install_to_plan";
  sanne.appointment = { date: inDays(-6), time: "11:30", technician: "Sven Bakker" };
  sanne.check = verified();
  sanne.quote = { generated_at: iso(6), sent_at: iso(5), decided_at: iso(2), items: items(1900) };
  sanne.log.push({ at: iso(2), text: "Klant is akkoord via de offertelink" });
  out.push(sanne);

  // 6. Installatie gepland (morgen)
  const tom = seedLead(
    "tom-bakker",
    { name: "Tom Bakker", email: "tom@example.nl", phone: "06 24681357", postcode: "5683 AB", street: "Dorpsplein 3", city: "Best" },
    { ...std, area: "30_40" },
    14,
  );
  tom.status = "install_planned";
  tom.appointment = { date: inDays(-9), time: "10:00", technician: "Sven Bakker" };
  tom.install_appointment = { date: days[0], time: "08:00", technician: "Lars Visser" };
  tom.check = verified();
  tom.quote = { generated_at: iso(9), sent_at: iso(8), decided_at: iso(6), items: items(2150) };
  tom.log.push({ at: iso(1, 11), text: `Installatie ingepland (${days[0]} 08:00, Lars Visser)` });
  out.push(tom);

  // 7. Installatie uitgevoerd, factuur nog te versturen
  const eva = seedLead(
    "eva-smits",
    { name: "Eva Smits", email: "eva@example.nl", phone: "06 13572468", postcode: "5611 KL", street: "Parklaan 18", city: "Eindhoven" },
    std,
    18,
  );
  eva.status = "install_done";
  eva.appointment = { date: inDays(-14), time: "13:00", technician: "Sven Bakker" };
  eva.install_appointment = { date: inDays(-1), time: "08:00", technician: "Sven Bakker" };
  eva.check = verified();
  eva.quote = { generated_at: iso(14), sent_at: iso(13), decided_at: iso(11), items: items(1900) };
  eva.install = {
    as_quoted: "no",
    units: "1",
    pipe_length: "5_10",
    checks: { condensate: true, vacuum_leak: true, test_run: true, explained: true, cleaned: true },
    serials: "BU-48213 / BI-77310",
    notes: "Extra doorvoer door de kelderwand nodig.",
    photos: [],
    extras: [{ id: "x", label: "Extra doorvoer kelderwand", amount: 180 }],
    completed_at: iso(1, 15, 30),
  };
  eva.invoice = { created_at: iso(1, 15, 30), items: [...items(1900), { id: "x", label: "Meerwerk: Extra doorvoer kelderwand", amount: 180 }] };
  eva.log.push({ at: iso(1, 15, 30), text: "Installatie afgerond door Sven Bakker" }, { at: iso(1, 15, 30), text: "Conceptfactuur gemaakt" });
  out.push(eva);

  let seq = 0;
  const invoiced = (lead: Lead, total: number, sentDaysAgo: number, paidDaysAgo?: number) => {
    seq += 1;
    const sent = iso(sentDaysAgo);
    lead.invoice = {
      number: formatInvoiceNumber(new Date().getFullYear(), seq),
      items: items(total - 650),
      created_at: sent,
      sent_at: sent,
      due_date: addDays(todayNl(), -sentDaysAgo + 14),
      ...(paidDaysAgo !== undefined ? { paid_at: iso(paidDaysAgo, 12) } : {}),
    };
    lead.quote = { generated_at: sent, sent_at: sent, decided_at: sent, items: items(total - 650) };
    lead.check = verified();
    lead.appointment = { date: addDays(todayNl(), -sentDaysAgo - 12), time: "10:00", technician: "Sven Bakker" };
    lead.install_appointment = { date: addDays(todayNl(), -sentDaysAgo - 1), time: "08:00", technician: "Lars Visser" };
  };

  // 8. Factuur verstuurd, nog niet betaald
  const kees = seedLead(
    "kees-de-boer",
    { name: "Kees de Boer", email: "kees@example.nl", phone: "06 97531246", postcode: "5342 AB", street: "Molenstraat 7", city: "Oss" },
    std,
    30,
  );
  kees.status = "invoice_sent";
  invoiced(kees, 2550, 5);
  kees.log.push({ at: iso(5), text: `Factuur ${kees.invoice!.number} verstuurd` });
  out.push(kees);

  // 9+. Afgeronde klussen over de afgelopen maanden
  const done: [string, string, string, number, number, number][] = [
    ["Lotte Maas", "Veghel", "5461 AA", 2400, 12, 1],
    ["Bram Vos", "Helmond", "5701 AB", 3100, 14, 3],
    ["Noor Kuipers", "Boxtel", "5281 CD", 2800, 20, 9],
    ["Daan Willems", "Schijndel", "5481 EF", 4200, 26, 16],
    ["Ilse Jacobs", "Uden", "5401 GH", 2650, 33, 24],
    ["Ruud Hendriks", "Oirschot", "5688 JK", 3550, 55, 41],
    ["Femke de Wit", "Vught", "5261 LM", 2950, 95, 78],
    ["Sjoerd Brandt", "Rosmalen", "5241 NP", 3300, 150, 132],
    ["Mila van Rooij", "Eindhoven", "5612 QR", 2700, 220, 205],
    ["Jens Peeters", "Tilburg", "5011 ST", 3850, 330, 300],
  ];
  done.forEach(([name, city, postcode, total, startedAgo, paidAgo], i) => {
    const l = seedLead(`afgerond-${i + 1}`, { name, email: `${name.split(" ")[0].toLowerCase()}@example.nl`, phone: "06 00000000", postcode, street: "Voorbeeldlaan 1", city }, std, startedAgo);
    l.status = "completed";
    invoiced(l, total, paidAgo + 4, paidAgo);
    l.log.push({ at: iso(paidAgo), text: "Betaling ontvangen, aanvraag afgerond" });
    out.push(l);
  });

  // Een afgewezen offerte
  const hanneke = seedLead(
    "hanneke-dekker",
    { name: "Hanneke Dekker", email: "hanneke@example.nl", phone: "06 31415926", postcode: "5211 TV", street: "Sint Janssingel 20", city: "Den Bosch" },
    { ...std, area: "40_60", property: "detached" },
    22,
  );
  hanneke.status = "rejected";
  hanneke.appointment = { date: inDays(-15), time: "11:30", technician: "Lars Visser" };
  hanneke.check = verified();
  hanneke.quote = { generated_at: iso(13), sent_at: iso(12), decided_at: iso(8), items: items(3400) };
  hanneke.log.push({ at: iso(8), text: "Klant heeft de offerte afgewezen via de offertelink" });
  out.push(hanneke);

  // Een nieuwe aanvraag van vandaag
  const rik = seedLead(
    "rik-smeets",
    { name: "Rik Smeets", email: "rik@example.nl", phone: "06 27182818", postcode: "5038 PM", street: "Oude Dijk 4", city: "Tilburg" },
    { spaces: "bedroom", area: "20_30", property: "terraced", outdoor: "facade", existing: "none" },
    0,
  );
  rik.preferred = { first: { date: days[4], part: "afternoon" }, second: { date: days[5], part: "any" } };
  out.push(rik);

  // Nog 30 klanten voor een vol overzicht: verspreid over alle fases en over het afgelopen jaar
  const more: [string, string, string][] = [
    ["Anouk Verbeek", "Breda", "4811 AB"], ["Thijs Mulder", "Tilburg", "5038 EA"], ["Sara Bos", "Goirle", "5051 CB"],
    ["Niels van Leeuwen", "Eindhoven", "5611 AC"], ["Yara Hoekstra", "Waalwijk", "5141 DD"], ["Gijs Kramer", "Oisterwijk", "5061 EE"],
    ["Eline Dijkstra", "Den Bosch", "5211 FF"], ["Stijn de Groot", "Helmond", "5701 GG"], ["Marit Smit", "Best", "5683 HH"],
    ["Joris Hermans", "Veldhoven", "5502 JJ"], ["Lieke Maas", "Oss", "5341 KK"], ["Wouter Kok", "Uden", "5401 LL"],
    ["Fenna Prins", "Boxtel", "5281 MM"], ["Ruben Evers", "Vught", "5261 NN"], ["Isa Bakker", "Rosmalen", "5241 PP"],
    ["Teun Aarts", "Schijndel", "5481 QQ"], ["Roos Wouters", "Veghel", "5461 RR"], ["Dirk Jonker", "Tilburg", "5011 SS"],
    ["Merel Visser", "Eindhoven", "5612 TT"], ["Lars Hendriks", "Breda", "4812 UU"], ["Nina Claassen", "Waalwijk", "5142 VV"],
    ["Pim Roelofs", "Goirle", "5052 WW"], ["Julia Peeters", "Oirschot", "5688 XX"], ["Sem van Beek", "Helmond", "5702 YY"],
    ["Eva Brouwer", "Den Bosch", "5212 ZZ"], ["Mats Janssen", "Best", "5684 AA"], ["Lotte Vermeer", "Oss", "5342 BB"],
    ["Bas Dekker", "Uden", "5402 CC"], ["Femke Rademakers", "Veldhoven", "5503 DD"], ["Jesse Koning", "Vught", "5262 EE"],
  ];
  const plan = [
    "new", "new", "new", "new",
    "visit_planned", "visit_planned", "visit_planned",
    "quote_review", "quote_review", "quote_review",
    "quote_sent", "quote_sent", "quote_sent",
    "install_to_plan", "install_to_plan",
    "install_planned", "install_planned", "install_planned",
    "install_done", "install_done",
    "invoice_sent", "invoice_sent", "invoice_sent",
    "rejected", "rejected",
    "completed", "completed", "completed", "completed", "completed",
  ] as const;
  const wd = workdaysFrom(inDays(1), 30);
  const techs = ["Sven Bakker", "Lars Visser"];
  more.forEach(([name, city, postcode], i) => {
    const status = plan[i];
    const l = seedLead(
      `klant-${i + 1}`,
      { name, email: `${name.split(" ")[0].toLowerCase()}.${i + 1}@example.nl`, phone: "06 00000000", postcode, street: "Voorbeeldstraat " + (i + 3), city },
      { ...std, area: ["20_30", "30_40", "40_60"][i % 3], property: ["terraced", "corner", "detached", "apartment"][i % 4] },
      status === "completed" ? 20 + i * 11 : 1 + (i % 9),
    );
    const total = 2200 + (i % 7) * 350;
    const tech = techs[i % 2];
    l.status = status;
    if (status === "new") {
      l.preferred = { first: { date: wd[(i * 2) % 30], part: "any" } };
    } else if (status === "visit_planned") {
      l.appointment = { date: wd[i % 30], time: ["08:30", "10:00", "13:00"][i % 3], technician: tech };
    } else if (status !== "rejected" || i % 2 === 0) {
      l.appointment = { date: inDays(-(8 + (i % 8))), time: "10:00", technician: tech };
      l.check = verified();
      l.quote = { generated_at: iso(6), items: items(total - 650), ...(status === "quote_review" ? {} : { sent_at: iso(5) }) };
      if (["install_to_plan", "install_planned", "install_done", "invoice_sent", "completed"].includes(status)) l.quote.decided_at = iso(3);
      if (status === "rejected") l.quote.decided_at = iso(2);
    }
    if (status === "install_planned") l.install_appointment = { date: wd[(i + 3) % 30], time: "08:00", technician: techs[(i + 1) % 2] };
    if (status === "install_done") {
      l.install_appointment = { date: inDays(-1), time: "08:00", technician: tech };
      l.install = {
        as_quoted: "yes", units: "1", pipe_length: "5_10",
        checks: { condensate: true, vacuum_leak: true, test_run: true, explained: true, cleaned: true },
        serials: "BU-" + (40000 + i), notes: "", photos: [], extras: [], completed_at: iso(1, 15),
      };
      l.invoice = { created_at: iso(1, 15), items: items(total - 650) };
    }
    if (status === "invoice_sent") invoiced(l, total, 3 + (i % 9));
    if (status === "completed") {
      const paidAgo = 5 + (i - 25) * 13 + 20;
      invoiced(l, total, paidAgo + 4, paidAgo);
      l.log.push({ at: iso(paidAgo), text: "Betaling ontvangen, aanvraag afgerond" });
    }
    out.push(l);
  });

  return { leads: out, invoiceSeq: seq };
}

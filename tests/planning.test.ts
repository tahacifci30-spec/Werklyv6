import assert from "node:assert/strict";
import { test } from "node:test";
import { blocks, freeSlots, overlaps, toMin, worksOn } from "../lib/agenda";
import { datesText, dayState, mondayOf, weekNumber } from "../lib/roster";
import { travelMinutes } from "../lib/travel";
import type { AgendaItem, TeamMember } from "../lib/types";

const team: TeamMember[] = [
  { name: "Sven", days: [0, 1, 2, 3, 4] },
  { name: "Oproep", days: [], extra: ["2030-01-05"] },
];
const item = (over: Partial<AgendaItem>): AgendaItem => ({ id: "i", company_id: "c", kind: "item", title: "x", date: "2030-01-07", who: "Sven", created_by: "Sven", ...over });

test("werkdagen: vaste dagen en losse goedgekeurde dagen", () => {
  assert.ok(worksOn(team, "Sven", "2030-01-07")); // maandag
  assert.ok(!worksOn(team, "Sven", "2030-01-05")); // zaterdag
  assert.ok(worksOn(team, "Oproep", "2030-01-05"));
  assert.ok(!worksOn(team, "Oproep", "2030-01-07"));
});

test("een overige afspraak blokkeert de tijden die erin vallen, niet de tijd erna", () => {
  const bl = blocks([], [item({ start: "10:00", end: "13:00" })], team);
  assert.ok(overlaps(bl, "Sven", "2030-01-07", toMin("11:30"), 90));
  assert.ok(!overlaps(bl, "Sven", "2030-01-07", toMin("13:00"), 90));
  assert.deepEqual(freeSlots(bl, "Sven", "2030-01-07", "visit"), ["08:30", "13:00", "14:30"]);
});

test("rooster: afmelding telt, een wachtende aanvraag nog niet", () => {
  const off = item({ kind: "off", title: "Ziek" });
  assert.equal(dayState(team[0], [off], [], "Sven", "2030-01-07").works, false);
  const pending = { id: "r", who: "Sven", kind: "off" as const, dates: ["2030-01-08"], status: "pending" as const, created_at: "" };
  const s = dayState(team[0], [], [pending], "Sven", "2030-01-08");
  assert.equal(s.works, true);
  assert.equal(s.pending, "off");
});

test("rooster: week en periodes", () => {
  assert.equal(mondayOf("2030-01-09"), "2030-01-07");
  assert.equal(weekNumber("2026-10-10"), 41);
  assert.match(datesText(["2030-01-07", "2030-01-08", "2030-01-10"]), /t\/m/);
});

test("reistijd: afgerond op 5 minuten, onbekende plek geeft geen tijd", () => {
  const tilburg = { lat: 51.56, lon: 5.09 };
  const waalwijk = { lat: 51.68, lon: 5.07 };
  const m = travelMinutes(tilburg, waalwijk)!;
  assert.equal(m % 5, 0);
  assert.ok(m >= 20 && m <= 40);
  assert.equal(travelMinutes(null, waalwijk), null);
  assert.equal(travelMinutes(tilburg, tilburg), 0);
});

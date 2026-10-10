import assert from "node:assert/strict";
import { test } from "node:test";
import { isComplete, nextQuestion, totalQuestions } from "../lib/intake/questions";
import { applyValueChange, estimatePrice, midPrice, unitsFor } from "../lib/pricing/engine";
import { DEFAULT_RULES, mergeRules } from "../lib/pricing/rules";

const one = { spaces: "living", area: "20_30", property: "terraced", outdoor: "facade", existing: "none" };

test("prijsindicatie: basisprijs plus de bedragen van de antwoorden", () => {
  assert.equal(midPrice(one), 1850 + 250);
  assert.deepEqual([estimatePrice(one).min, estimatePrice(one).max], [1950, 2400]);
});

test("meer units tellen de prijs voor een extra unit mee", () => {
  const two = { spaces: "living_bedroom", area: "20_30", property: "terraced", outdoor: "facade", system: "separate" };
  assert.equal(unitsFor(two), 2);
  assert.equal(midPrice(two), 1850 + 1350 + 250);
});

test("weet ik niet maakt de range breder en kost niets extra", () => {
  const unknown = { ...one, area: "unknown" };
  const e = estimatePrice(unknown);
  assert.equal(midPrice(unknown), 1850);
  assert.deepEqual(e.unknownFactors, ["oppervlakte"]);
  assert.ok(e.max - e.min > estimatePrice({ ...one, area: "lt20" }).max - estimatePrice({ ...one, area: "lt20" }).min);
});

test("formulier: vervolgvraag hangt af van het aantal ruimtes", () => {
  const form = DEFAULT_RULES.form;
  assert.equal(nextQuestion(form, {})?.id, "spaces");
  assert.equal(totalQuestions(form, {}), 5);
  assert.equal(nextQuestion(form, { spaces: "multiple", area: "lt20", property: "corner", outdoor: "roof" })?.id, "system");
  assert.equal(nextQuestion(form, { spaces: "living", area: "lt20", property: "corner", outdoor: "roof" })?.id, "existing");
  assert.ok(isComplete(form, one));
});

test("oude opgeslagen toeslagen blijven gelden zolang er geen eigen formulier is", () => {
  const rules = mergeRules({ areaSurcharge: { lt20: 0, "20_30": 400, "30_40": 500, gt40: 900 } });
  assert.equal(midPrice(one, rules), 1850 + 400);
});

test("een andere waarde in de offerte zet het verschil op de installatieregel", () => {
  const items = [
    { id: "a", label: "Airco-installatie (1 unit)", amount: 3300 },
    { id: "b", label: "Montage", amount: 650 },
  ];
  const out = applyValueChange(items, one, { ...one, area: "30_40" }, DEFAULT_RULES);
  assert.equal(out[0].amount, 3550);
  assert.equal(out[1].amount, 650);
});

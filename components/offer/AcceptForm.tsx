import { SubmitButton } from "../SubmitButton";

/**
 * Akkoord geven op de offerte. De klant kiest hier geen datum: de eigenaar plant de installatie zelf
 * en neemt daarvoor contact op. Akkoord zet de aanvraag op "Installatie plannen", niet akkoord rondt hem af.
 */
export function AcceptForm({
  accept,
  reject,
  companyName,
}: {
  accept: () => Promise<void>;
  reject: () => Promise<void>;
  companyName: string;
}) {
  return (
    <div className="rounded-xl bg-brand-soft p-4 sm:p-5">
      <p className="font-semibold">Akkoord met deze offerte?</p>
      <p className="mt-1 text-sm text-slate-700">
        Door akkoord te gaan geeft u opdracht. {companyName} neemt daarna contact met u op om de installatie in te plannen.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={accept}>
          <SubmitButton pendingText="Verwerken…">Akkoord, geef opdracht</SubmitButton>
        </form>
        <form action={reject}>
          <SubmitButton variant="secondary" pendingText="Verwerken…">
            Niet akkoord
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

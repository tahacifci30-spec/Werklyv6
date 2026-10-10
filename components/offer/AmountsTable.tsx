import { formatEur, qtyText, quoteTotal } from "@/lib/pricing/engine";
import type { QuoteItem } from "@/lib/types";

/**
 * Regels met bedragen voor een offerte of factuur. De opgeslagen bedragen zijn inclusief btw.
 * Particulier: alles inclusief btw, met daaronder het btw-deel. Bedrijf: regels exclusief btw, dan btw en totaal.
 */
export function AmountsTable({ items, business, caption }: { items: QuoteItem[]; business: boolean; caption: string }) {
  const total = quoteTotal(items);
  const subtotal = total / 1.21;
  const vat = total - subtotal;
  const shown = (n: number) => formatEur(business ? n / 1.21 : n);

  return (
    <>
      <table className="mt-7 w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th scope="col" className="py-2 font-semibold">Omschrijving</th>
            <th scope="col" className="py-2 text-right font-semibold">{business ? "Bedrag excl. btw" : "Bedrag incl. btw"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((i) => (
            <tr key={i.id}>
              <td className="break-words py-3 pr-3">
                {i.label}
                {qtyText(i) && <span className="tabular block text-xs text-muted">{business && i.price !== undefined ? qtyText({ ...i, price: i.price / 1.21 }) : qtyText(i)}</span>}
              </td>
              <td className="tabular py-3 text-right">{shown(i.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="tabular text-sm">
          {business ? (
            <>
              <tr>
                <td className="pt-4 text-muted">Subtotaal excl. btw</td>
                <td className="pt-4 text-right">{formatEur(subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Btw 21%</td>
                <td className="py-1 text-right">{formatEur(vat)}</td>
              </tr>
              <tr className="text-lg font-semibold">
                <td className="border-t border-line pt-3">Totaal incl. btw</td>
                <td className="border-t border-line pt-3 text-right">{formatEur(total)}</td>
              </tr>
            </>
          ) : (
            <>
              <tr className="text-lg font-semibold">
                <td className="border-t border-line pt-3">Totaal incl. btw</td>
                <td className="border-t border-line pt-3 text-right">{formatEur(total)}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Waarvan btw 21%</td>
                <td className="py-1 text-right text-muted">{formatEur(vat)}</td>
              </tr>
            </>
          )}
        </tfoot>
      </table>
      <p className="mt-3 text-xs text-muted">
        {business ? "Bedragen per regel zijn exclusief btw." : "Alle bedragen zijn inclusief btw."}
      </p>
    </>
  );
}

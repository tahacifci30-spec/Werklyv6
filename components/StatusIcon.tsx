import type { LeadStatus } from "@/lib/types";

const PATHS: Record<LeadStatus | "open" | "bezig" | "afgerond", string> = {
  open: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6z",
  bezig: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  afgerond: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  new: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6z",
  visit_planned: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  visit_done: "M9 4h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4",
  quote_review: "M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h4",
  quote_sent: "M4 12l16-8-6 16-3-7z",
  install_to_plan: "M4 6h16v14H4zM4 10h16M12 13v5M9.500 15.500h5",
  install_planned: "M14.700 6.300a1 1 0 0 0 0 1.400l1.600 1.600a1 1 0 0 0 1.400 0l3.770-3.770a6 6 0 0 1-7.940 7.940l-6.910 6.910a2.120 2.120 0 0 1-3-3l6.910-6.910a6 6 0 0 1 7.940-7.940l-3.760 3.760z",
  install_done: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  invoice_sent: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  completed: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  rejected: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6",
};

/** Pictogram bij een status of hoofdgroep. Decoratief: de tekst ernaast zegt wat het is. */
export function StatusIcon({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

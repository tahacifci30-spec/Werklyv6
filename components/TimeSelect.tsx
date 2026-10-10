"use client";

/** Tijd kiezen in 24-uurs notatie (geen AM/PM), per kwartier. Werkt in elke browser hetzelfde. */
const OPTIONS = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const m = 6 * 60 + i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

export function TimeSelect({
  id,
  name,
  defaultValue,
  placeholder = "Kies een tijd",
  className = "",
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      className={`min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-foreground focus:border-brand ${className}`}
    >
      <option value="">{placeholder}</option>
      {defaultValue && !OPTIONS.includes(defaultValue) && <option value={defaultValue}>{defaultValue}</option>}
      {OPTIONS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

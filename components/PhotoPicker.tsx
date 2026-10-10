"use client";

import { useRef, useState } from "react";
import { btn } from "./ui";

/** Nederlandse fotokiezer. De standaardknop van de browser toont Engelse tekst ("Choose files"). */
export function PhotoPicker({
  id = "photos",
  name = "photos",
  label,
  help,
}: {
  id?: string;
  name?: string;
  label: string;
  help?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(0);
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={ref}
          id={id}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => setCount(e.target.files?.length ?? 0)}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={`${btn.secondary} cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand`}
        >
          Foto&apos;s kiezen
        </label>
        <span aria-live="polite" className="text-sm text-muted">
          {count === 0 ? "Geen foto gekozen" : count === 1 ? "1 foto gekozen" : `${count} foto's gekozen`}
        </span>
        {count > 0 && (
          <button
            type="button"
            onClick={() => {
              if (ref.current) ref.current.value = "";
              setCount(0);
            }}
            className="min-h-11 px-1 text-sm font-medium text-brand underline"
          >
            Wissen
          </button>
        )}
      </div>
      {help && (
        <p id={`${id}-help`} className="mt-1 text-sm text-muted">
          {help}
        </p>
      )}
    </div>
  );
}

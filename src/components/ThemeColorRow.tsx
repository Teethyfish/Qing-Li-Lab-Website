// src/components/ThemeColorRow.tsx
"use client";

import { useState } from "react";

export default function ThemeColorRow({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [val, setVal] = useState(defaultValue || "#000000");

  return (
    <label className="grid gap-1.5">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={val}
          onChange={(e) => setVal(e.currentTarget.value)}
          aria-label={`${label} color`}
        />
        <input
          name={name}
          value={val}
          onChange={(e) => setVal(e.currentTarget.value)}
          className="w-full rounded border p-2 font-mono text-sm"
          placeholder="#2563eb"
        />
      </div>
    </label>
  );
}

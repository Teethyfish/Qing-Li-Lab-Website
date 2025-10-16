// src/app/people/page.tsx
import Link from "next/link";
import { PEOPLE } from "@/data/people";

export default function PeoplePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>People</h1>
      <ul style={{ lineHeight: 2 }}>
        {PEOPLE.map(p => (
          <li key={p.slug}>
            <Link href={`/people/${p.slug}`}>{p.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

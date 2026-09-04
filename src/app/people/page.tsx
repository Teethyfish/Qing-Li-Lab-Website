// src/app/people/page.tsx
import Link from "next/link";
import { PEOPLE } from "@/data/people";
import { getTranslations } from "next-intl/server";

export default async function PeoplePage() {
  const t = await getTranslations("home");
  return (
    <main>
      <h1>{t("labMembers")}</h1>
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

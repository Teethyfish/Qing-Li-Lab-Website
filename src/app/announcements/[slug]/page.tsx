// src/app/announcements/[slug]/page.tsx
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AnnouncementDetailsPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations();

  // Fetch announcement by slug, regardless of status (ACTIVE or ARCHIVED)
  const announcement = await prisma.announcement.findUnique({
    where: { detailsSlug: slug },
  });

  // If announcement doesn't exist or doesn't have a details page, show 404
  if (!announcement || !announcement.hasDetailsPage) {
    notFound();
  }

  // Get locale from headers
  const locale = (await import("next-intl/server")).getLocale();
  const currentLocale = await locale();

  // Parse translations
  const parseTranslations = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return { en: jsonString };
    }
  };

  const titleTranslations = parseTranslations(announcement.title);
  const detailsTranslations = announcement.detailsContent
    ? parseTranslations(announcement.detailsContent)
    : { en: "" };

  // Get localized content
  const getLocalizedText = (translations: any) => {
    return translations[currentLocale] || translations.en || "";
  };

  const title = getLocalizedText(titleTranslations);
  const details = getLocalizedText(detailsTranslations);

  // Parse cropped area if exists
  const croppedArea = announcement.croppedArea
    ? JSON.parse(announcement.croppedArea)
    : null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      {/* Banner Image */}
      <div
        style={{
          width: "100%",
          height: 400,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: "2rem",
          position: "relative",
          border: "1px solid color-mix(in oklab, var(--color-text) 12%, transparent)",
        }}
      >
        <img
          src={announcement.imageUrl}
          alt={title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: croppedArea
              ? `${croppedArea.x}% ${croppedArea.y}%`
              : "center",
          }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "2rem",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>

      {/* Details Content */}
      <div
        style={{
          fontSize: "1.1rem",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
        }}
      >
        {details}
      </div>

      {/* Back link */}
      <div style={{ marginTop: "3rem" }}>
        <a
          href="/"
          style={{
            color: "var(--color-text)",
            textDecoration: "underline",
            fontSize: "1rem",
          }}
        >
          ← Back to home
        </a>
      </div>
    </main>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const announcement = await prisma.announcement.findUnique({
    where: { detailsSlug: slug },
  });

  if (!announcement) {
    return {
      title: "Announcement Not Found",
    };
  }

  const parseTranslations = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return { en: jsonString };
    }
  };

  const titleTranslations = parseTranslations(announcement.title);

  return {
    title: titleTranslations.en || "Announcement",
  };
}

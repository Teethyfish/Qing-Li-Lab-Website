"use client";

import { useState, useEffect } from "react";

type Announcement = {
  id: string;
  imageUrl: string;
  text: string;
};

type Props = {
  announcements: Announcement[];
  locale: string;
};

export default function AnnouncementCarousel({ announcements, locale }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // Auto-rotate every 5 seconds (unless hovering)
  useEffect(() => {
    if (announcements.length <= 1 || isHovering) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length, isHovering]);

  if (announcements.length === 0) {
    return null;
  }

  const parseTranslations = (textJson: string) => {
    try {
      return JSON.parse(textJson);
    } catch {
      return { en: textJson };
    }
  };

  const getLocalizedText = (textJson: string) => {
    const translations = parseTranslations(textJson);
    // Try to get the text in the user's locale, fall back to English
    return translations[locale] || translations.en || "";
  };

  const currentAnnouncement = announcements[currentIndex];
  const displayText = getLocalizedText(currentAnnouncement.text);

  return (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        position: "relative",
        width: "100%",
        height: 400,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 6px color-mix(in oklab, var(--color-text) 10%, transparent)",
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${currentAnnouncement.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "opacity 0.5s ease-in-out",
        }}
      />

      {/* Gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 50%, transparent 100%)",
        }}
      />

      {/* Text overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "2rem",
          color: "#ffffff",
        }}
      >
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            lineHeight: 1.3,
            margin: 0,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
          }}
        >
          {displayText}
        </h2>
      </div>

      {/* Navigation dots */}
      {announcements.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          {announcements.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "2px solid #ffffff",
                background: index === currentIndex ? "#ffffff" : "transparent",
                cursor: "pointer",
                transition: "background 0.3s ease",
                padding: 0,
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Navigation arrows */}
      {announcements.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrentIndex((prev) =>
                prev === 0 ? announcements.length - 1 : prev - 1
              )
            }
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.3)",
              border: "none",
              color: "#ffffff",
              fontSize: "1.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.3s ease",
              backdropFilter: "blur(4px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.3)",
              border: "none",
              color: "#ffffff",
              fontSize: "1.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.3s ease",
              backdropFilter: "blur(4px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

type Announcement = {
  id: string;
  imageUrl: string;
  title: string;
  text: string;
  hasDetailsPage: boolean;
  detailsSlug: string | null;
};

type Props = {
  announcements: Announcement[];
  locale: string;
};

export default function AnnouncementCarousel({ announcements, locale }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle initial load animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate every 5 seconds (unless hovering)
  useEffect(() => {
    if (announcements.length <= 1 || isHovering) return;

    const interval = setInterval(() => {
      handleSlideChange((prev) => (prev + 1) % announcements.length, "right");
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length, isHovering]);

  const handleSlideChange = (indexOrFunction: number | ((prev: number) => number), direction: "left" | "right") => {
    setIsTransitioning(true);
    setSlideDirection(direction);

    setTimeout(() => {
      setCurrentIndex(indexOrFunction);
      setIsTransitioning(false);
    }, 300);
  };

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
  const displayTitle = getLocalizedText(currentAnnouncement.title);
  const displayText = getLocalizedText(currentAnnouncement.text);

  const bannerContent = (
    <div
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        position: "relative",
        width: "100%",
        height: 500,
        overflow: "hidden",
      }}
    >
      {/* Content wrapper with animation */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: isInitialLoad
            ? "translateX(100px)"
            : isTransitioning
              ? slideDirection === "right" ? "translateX(100px)" : "translateX(-100px)"
              : "translateX(0)",
          opacity: isInitialLoad || isTransitioning ? 0 : 1,
          transition: "transform 0.6s ease-out, opacity 0.6s ease-out",
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

        {/* Bottom fade to background color */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "120px",
            background: "linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Text overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            left: 0,
            right: 0,
            padding: "2rem",
            color: "#ffffff",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: 0,
              marginBottom: "0.5rem",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            {displayTitle}
          </h2>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 400,
              lineHeight: 1.4,
              margin: 0,
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            {displayText}
          </p>
        </div>
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
              className="carousel-dot-button"
              onClick={() => {
                const direction = index > currentIndex ? "right" : "left";
                handleSlideChange(index, direction);
              }}
              style={{
                width: "12px",
                height: "12px",
                minWidth: "12px",
                minHeight: "12px",
                borderRadius: "50%",
                border: "2px solid #ffffff",
                background: index === currentIndex ? "#ffffff" : "transparent",
                transition: "all 0.3s ease",
                display: "inline-block",
                flexShrink: 0,
                padding: 0,
                margin: 0,
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
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
            className="carousel-nav-button"
            onClick={() =>
              handleSlideChange(
                (prev) => (prev === 0 ? announcements.length - 1 : prev - 1),
                "left"
              )
            }
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            className="carousel-nav-button"
            onClick={() => handleSlideChange((prev) => (prev + 1) % announcements.length, "right")}
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              color: "#ffffff",
              fontSize: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}
    </div>
  );

  // If the announcement has a details page, wrap it in a link
  if (currentAnnouncement.hasDetailsPage && currentAnnouncement.detailsSlug) {
    return (
      <a
        href={`/announcements/${currentAnnouncement.detailsSlug}`}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          cursor: "pointer",
        }}
      >
        {bannerContent}
      </a>
    );
  }

  return bannerContent;
}

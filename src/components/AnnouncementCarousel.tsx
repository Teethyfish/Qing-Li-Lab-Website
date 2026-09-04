"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type Announcement = {
  id: string;
  imageUrl: string;
  title: string;
  text: string;
  hasDetailsPage: boolean;
  detailsSlug: string | null;
};

type Props = { announcements: Announcement[]; locale: string };

export default function AnnouncementCarousel({ announcements, locale }: Props) {
  const t = useTranslations("home");
  const count = announcements.length;
  const [trackIndex, setTrackIndex] = useState(count > 1 ? 1 : 0);
  const [animated, setAnimated] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const slides = useMemo(() => count > 1
    ? [announcements[count - 1], ...announcements, announcements[0]]
    : announcements,
  [announcements, count]);

  const currentIndex = count <= 1 ? 0 : trackIndex === 0 ? count - 1 : trackIndex === count + 1 ? 0 : trackIndex - 1;

  useEffect(() => {
    setAnimated(false);
    setTrackIndex(count > 1 ? 1 : 0);
    setIsMoving(false);
    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, [count]);

  const move = useCallback((direction: -1 | 1) => {
    if (count <= 1 || isMoving) return;
    setAnimated(true);
    setIsMoving(true);
    setTrackIndex((index) => index + direction);
  }, [count, isMoving]);

  useEffect(() => {
    if (count <= 1 || isHovering || isMoving) return;
    const timer = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(timer);
  }, [count, isHovering, isMoving, move]);

  if (!count) return null;

  const localized = (value: string) => {
    try {
      const translations = JSON.parse(value) as Record<string, string>;
      return translations[locale] || translations.en || "";
    } catch {
      return value;
    }
  };

  const finishMove = () => {
    if (trackIndex === 0 || trackIndex === count + 1) {
      setAnimated(false);
      setTrackIndex(trackIndex === 0 ? count : 1);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    }
    setIsMoving(false);
  };

  const goTo = (index: number) => {
    if (isMoving || index === currentIndex) return;
    setAnimated(true);
    setIsMoving(true);
    setTrackIndex(index + 1);
  };

  return <div className="announcement-carousel" data-edit-ignore="true" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
    <div
      className="announcement-track"
      onTransitionEnd={finishMove}
      style={{
        width: `${slides.length * 100}%`,
        transform: `translate3d(-${trackIndex * (100 / slides.length)}%, 0, 0)`,
        transition: animated ? "transform 650ms cubic-bezier(.22,.61,.36,1)" : "none",
      }}
    >
      {slides.map((announcement, index) => {
        const content = <div className="announcement-slide-content">
          <div className="announcement-slide-image" style={{ backgroundImage: `url(${announcement.imageUrl})` }} />
          <div className="announcement-slide-shade" />
          <div className="announcement-slide-copy">
            <h2>{localized(announcement.title)}</h2>
            <p>{localized(announcement.text)}</p>
          </div>
        </div>;
        return <div className="announcement-slide" style={{ width: `${100 / slides.length}%` }} key={`${announcement.id}-${index}`}>
          {announcement.hasDetailsPage && announcement.detailsSlug
            ? <Link className="announcement-slide-link" href={`/announcements/${announcement.detailsSlug}`}>{content}</Link>
            : content}
        </div>;
      })}
    </div>

    {count > 1 ? <>
      <div className="announcement-dots">
        {announcements.map((announcement, index) => <button
          key={announcement.id}
          type="button"
          className={`carousel-dot-button${index === currentIndex ? " active" : ""}`}
          onClick={() => goTo(index)}
          aria-label={t("goToSlide", { number: index + 1 })}
          aria-current={index === currentIndex ? "true" : undefined}
        />)}
      </div>
      <button type="button" className="carousel-nav-button announcement-arrow previous" onClick={() => move(-1)} aria-label={t("previousSlide")}>‹</button>
      <button type="button" className="carousel-nav-button announcement-arrow next" onClick={() => move(1)} aria-label={t("nextSlide")}>›</button>
    </> : null}
  </div>;
}

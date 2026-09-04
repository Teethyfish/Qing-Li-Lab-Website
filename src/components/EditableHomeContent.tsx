"use client";

import { useEffect, useState } from "react";
import EditableText from "./EditableText";
import { useEditMode } from "@/contexts/EditModeContext";

type Props = {
  labTitle: string;
  labSubtitle: string;
};

export default function EditableHomeContent({ labTitle, labSubtitle }: Props) {
  const { isEditMode } = useEditMode();
  const fullTitle = `${labTitle} – ${labSubtitle}`;
  // The server-rendered fallback must contain the complete heading. If a
  // browser cannot hydrate for any reason, visitors still see the lab name
  // instead of an indefinitely blinking cursor.
  const [typedLength, setTypedLength] = useState(fullTitle.length);
  const [animationComplete, setAnimationComplete] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setTypedLength(fullTitle.length);
      setAnimationComplete(true);
      setShowCursor(true);
      const cursorTimeout = window.setTimeout(() => setShowCursor(false), 5000);
      return () => window.clearTimeout(cursorTimeout);
    }

    setTypedLength(0);
    setAnimationComplete(false);
    setShowCursor(true);

    let currentLength = 0;
    let cursorTimeout: number | undefined;
    const interval = window.setInterval(() => {
      currentLength += 1;
      setTypedLength(currentLength);

      if (currentLength >= fullTitle.length) {
        window.clearInterval(interval);
        setAnimationComplete(true);
        cursorTimeout = window.setTimeout(() => setShowCursor(false), 5000);
      }
    }, 28);

    return () => {
      window.clearInterval(interval);
      if (cursorTimeout) window.clearTimeout(cursorTimeout);
    };
  }, [fullTitle]);

  const showEditableTitle = isEditMode || animationComplete;

  return (
    <header data-edit-ignore="true">
      <h1
        aria-label={isEditMode ? undefined : fullTitle}
        style={{ fontSize: "2rem", fontWeight: 700, minHeight: "1.2em" }}
      >
        {showEditableTitle ? (
          <>
            <EditableText
              contentKey="home.labTitle"
              initialValue={labTitle}
              as="span"
            />{" "}
            <span>
              – <EditableText
                contentKey="home.labSubtitle"
                initialValue={labSubtitle}
                as="span"
              />
            </span>
          </>
        ) : (
          <span aria-hidden="true">{fullTitle.slice(0, typedLength)}</span>
        )}
        {showCursor && !isEditMode ? (
          <span className="typewriter-cursor" aria-hidden="true">|</span>
        ) : null}
      </h1>
    </header>
  );
}

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
  const [typedLength, setTypedLength] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setTypedLength(fullTitle.length);
      setAnimationComplete(true);
      setShowCursor(false);
      return;
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
        cursorTimeout = window.setTimeout(() => setShowCursor(false), 500);
      }
    }, 16);

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
            <span className="muted" style={{ fontWeight: 400 }}>
              – <EditableText
                contentKey="home.labSubtitle"
                initialValue={labSubtitle}
                as="span"
                className="muted"
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

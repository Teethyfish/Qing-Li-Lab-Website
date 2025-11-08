"use client";

import { useState, useEffect, useRef } from "react";
import { useEditMode } from "@/contexts/EditModeContext";

type Props = {
  contentKey: string;
  initialValue: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  style?: React.CSSProperties;
};

export default function EditableText({
  contentKey,
  initialValue,
  as: Component = "span",
  className,
  style,
}: Props) {
  const { isEditMode, editedContent, updateContent } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update local value when initial value changes
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  // Use edited content if available
  const displayValue = editedContent[contentKey] ?? localValue;

  const handleClick = () => {
    if (isEditMode && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      if (localValue !== displayValue) {
        updateContent(contentKey, localValue);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setLocalValue(displayValue);
      setIsEditing(false);
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const editableStyle: React.CSSProperties | undefined = isEditMode && !isEditing
    ? {
        ...(style || {}),
        cursor: "pointer",
        outline: "2px dashed rgba(245, 158, 11, 0.5)",
        outlineOffset: "2px",
        padding: "2px 4px",
        borderRadius: "4px",
        transition: "outline 0.2s",
      }
    : style;

  const inputStyle: React.CSSProperties = {
    ...(style || {}),
    width: "100%",
    padding: "4px 8px",
    border: "2px solid var(--btn-warning-bg, #f59e0b)",
    borderRadius: "4px",
    background: "var(--color-card)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
  };

  if (isEditing) {
    // Multiline for longer text
    if (localValue.length > 50 || localValue.includes("\n")) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={className}
          style={inputStyle}
          rows={Math.max(2, localValue.split("\n").length)}
        />
      );
    }

    // Single line input
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        style={inputStyle}
      />
    );
  }

  return (
    <Component onClick={handleClick} className={className} style={editableStyle}>
      {displayValue}
    </Component>
  );
}

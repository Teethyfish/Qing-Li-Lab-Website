"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { useEditMode } from "@/contexts/EditModeContext";

const TEXT_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "li",
  "dt",
  "dd",
  "figcaption",
  "small",
  "strong",
  "a",
  "div",
].join(",");

const EXCLUDED_ANCESTORS = [
  "nav",
  "form",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "script",
  "style",
  "[data-edit-ignore='true']",
].join(",");

type Props = {
  canEdit: boolean;
  initialContent: Record<string, { value: string; format: "text" | "html" }>;
  children: ReactNode;
};

function isTextElement(element: HTMLElement) {
  if (element.closest(EXCLUDED_ANCESTORS)) return false;
  if (element.parentElement?.closest("[data-global-content-key]")) return false;
  if (element.querySelector("button, input, textarea, select, iframe, img, video, audio")) return false;

  const richBlock = /^(H[1-6]|P|LI|DT|DD|FIGCAPTION)$/.test(element.tagName);
  if (!richBlock && element.children.length > 0) return false;

  const text = element.textContent?.trim() ?? "";
  return text.length >= 2;
}

function elementPath(element: HTMLElement, root: HTMLElement) {
  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== root) {
    if (current.id) {
      segments.unshift(`id(${current.id})`);
      break;
    }

    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;

    const sameTagSiblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === current?.tagName
    );
    const position = sameTagSiblings.indexOf(current) + 1;
    segments.unshift(`${current.tagName.toLowerCase()}:${position}`);
    current = parent;
  }

  return segments.join("/");
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

// A small deterministic hash keeps keys stable when surrounding markup moves.
// The locale and pathname are added by the caller, so identical copy on two
// pages remains independently editable.
function textHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export default function GlobalContentEditor({ canEdit, initialContent, children }: Props) {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const { isEditMode, editedContent, updateContent } = useEditMode();
  const editedContentRef = useRef(editedContent);
  editedContentRef.current = editedContent;

  const prepareElements = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const occurrences = new Map<string, number>();

    root.querySelectorAll<HTMLElement>(TEXT_SELECTOR).forEach((element) => {
      if (!isTextElement(element)) return;

      const locale = document.documentElement.lang || "en";
      const original = element.dataset.globalOriginal ?? element.textContent ?? "";
      if (element.dataset.globalOriginal === undefined) {
        element.dataset.globalOriginal = original;
        element.dataset.globalOriginalHtml = element.innerHTML;
      }

      const fingerprint = textHash(normalizedText(original));
      const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
      occurrences.set(fingerprint, occurrence);

      const key = `content:${locale}:${pathname}:text:${fingerprint}:${occurrence}`;
      const legacyKey = `content:${locale}:${pathname}:${elementPath(element, root)}`;
      const previousKey = element.dataset.globalContentKey;

      if (previousKey !== key) {
        element.dataset.globalContentKey = key;
        element.dataset.globalLegacyContentKey = legacyKey;

        const hasPendingEdit = Object.prototype.hasOwnProperty.call(editedContentRef.current, key);
        const saved = initialContent[key] ?? initialContent[legacyKey];
        if (hasPendingEdit) {
          element.innerHTML = editedContentRef.current[key];
        } else if (saved?.format === "html") {
          element.innerHTML = saved.value;
        } else if (saved?.format === "text") {
          element.textContent = saved.value;
        }
      }

      if (!isEditMode) {
        const resting = initialContent[key] ?? initialContent[legacyKey];
        if (resting?.format === "html" && element.innerHTML !== resting.value) element.innerHTML = resting.value;
        else if (resting?.format === "text" && element.textContent !== resting.value) element.textContent = resting.value;
        else if (!resting) {
          const originalHtml = element.dataset.globalOriginalHtml ?? "";
          if (element.innerHTML !== originalHtml) element.innerHTML = originalHtml;
        }
      }

      if (canEdit && isEditMode) {
        element.setAttribute("contenteditable", "true");
        element.setAttribute("data-global-editable", "true");
        element.setAttribute("spellcheck", "true");
      } else {
        element.removeAttribute("contenteditable");
        element.removeAttribute("data-global-editable");
        element.removeAttribute("spellcheck");
      }
    });
  }, [canEdit, initialContent, isEditMode, pathname]);

  useLayoutEffect(() => {
    prepareElements();

    const root = rootRef.current;
    if (!root) return;

    const observer = new MutationObserver(prepareElements);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [prepareElements]);

  const editableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return null;
    return target.closest<HTMLElement>("[data-global-content-key]");
  };

  const saveTarget = (target: HTMLElement) => {
    const key = target.dataset.globalContentKey;
    if (key) updateContent(key, target.innerHTML.trim());
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canEdit || !isEditMode) return;
    const target = editableTarget(event.target);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    target.focus();
  };

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = editableTarget(event.target);
    if (target) target.dataset.editStartValue = target.innerHTML;
  };

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const target = editableTarget(event.target);
    if (target) saveTarget(target);
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = editableTarget(event.target);
    if (target) saveTarget(target);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = editableTarget(event.target);
    if (!target) return;

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      target.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      target.innerHTML = target.dataset.editStartValue ?? target.innerHTML;
      saveTarget(target);
      target.blur();
    }
  };

  return (
    <div
      ref={rootRef}
      data-global-content-root="true"
      onClickCapture={handleClick}
      onFocusCapture={handleFocus}
      onInputCapture={handleInput}
      onBlurCapture={handleBlur}
      onKeyDownCapture={handleKeyDown}
    >
      {children}
    </div>
  );
}

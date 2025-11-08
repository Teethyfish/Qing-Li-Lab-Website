"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type EditModeContextType = {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  editedContent: Record<string, string>;
  updateContent: (key: string, value: string) => void;
  resetContent: () => void;
};

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  const updateContent = (key: string, value: string) => {
    setEditedContent((prev) => ({ ...prev, [key]: value }));
  };

  const resetContent = () => {
    setEditedContent({});
  };

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        editedContent,
        updateContent,
        resetContent,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}

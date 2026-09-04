"use client";

import { useFormStatus } from "react-dom";
import { deleteDocumentEntry } from "./actions";

type Props = {
  documentId: string;
  documentTitle: string;
  label: string;
  deletingLabel: string;
  confirmMessage: string;
};

function SubmitButton({ label, deletingLabel }: Pick<Props, "label" | "deletingLabel">) {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-warning" type="submit" disabled={pending}>
      {pending ? deletingLabel : label}
    </button>
  );
}

export default function AdminDeleteDocumentButton({
  documentId,
  documentTitle,
  label,
  deletingLabel,
  confirmMessage,
}: Props) {
  return (
    <form
      action={deleteDocumentEntry}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage.replace("{title}", documentTitle))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={documentId} />
      <SubmitButton label={label} deletingLabel={deletingLabel} />
    </form>
  );
}

"use client";

import EditableText from "./EditableText";

type Props = {
  labTitle: string;
  labSubtitle: string;
};

export default function EditableHomeContent({ labTitle, labSubtitle }: Props) {
  return (
    <header>
      <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>
        <EditableText
          contentKey="home.labTitle"
          initialValue={labTitle}
          as="span"
        />{" "}
        <span className="muted" style={{ fontWeight: 400 }}>
          - <EditableText
            contentKey="home.labSubtitle"
            initialValue={labSubtitle}
            as="span"
            className="muted"
          />
        </span>
      </h1>
    </header>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Instrument = { id: string; name: string; isAvailable: boolean };

export default function InstrumentRequestForm({ instruments, initialInstrumentId }: { instruments: Instrument[]; initialInstrumentId?: string }) {
  const t = useTranslations("sitePages.instrumentRequest");
  const [selected, setSelected] = useState<string[]>(initialInstrumentId && instruments.some((item) => item.id === initialInstrumentId) ? [initialInstrumentId] : []);
  const [trainingRequired, setTrainingRequired] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected.length) return setError(t("selectInstrument"));
    if (trainingRequired === null) return setError(t("selectTraining"));
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/instrument-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"), department: form.get("department"), supervisor: form.get("supervisor"),
          email: form.get("email"), experimentDescription: form.get("experimentDescription"),
          website: form.get("website"), instrumentIds: selected, trainingRequired,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("submitError"));
      setSuccess(true);
      event.currentTarget.reset();
      setSelected([]);
      setTrainingRequired(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("submitError"));
    } finally { setBusy(false); }
  };

  if (success) return <div className="card" data-edit-ignore="true"><h2>{t("submitted")}</h2><p>{t("submittedText")}</p><button className="btn btn-muted" onClick={() => setSuccess(false)}>{t("submitAnother")}</button></div>;

  return <form onSubmit={submit} className="card instrument-request-form" data-edit-ignore="true">
    <label className="form-field"><strong>{t("name")}</strong><input name="name" autoComplete="name" required maxLength={160} /></label>
    <label className="form-field"><strong>{t("department")}</strong><input name="department" required maxLength={240} /></label>
    <label className="form-field"><strong>{t("supervisor")} <span className="muted">{t("ifApplicable")}</span></strong><input name="supervisor" maxLength={240} /></label>
    <label className="form-field"><strong>{t("email")}</strong><input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <fieldset><legend><strong>{t("requested")}</strong></legend><div style={{ display: "grid", gap: ".6rem", marginTop: ".75rem" }}>
      {instruments.map((instrument) => <label key={instrument.id} style={{ display: "flex", alignItems: "center", gap: ".6rem" }}><input type="checkbox" checked={selected.includes(instrument.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, instrument.id] : current.filter((id) => id !== instrument.id))} /> {instrument.name} {!instrument.isAvailable ? <span className="muted">{t("currentlyUnavailable")}</span> : null}</label>)}
      {!instruments.length ? <span className="muted">{t("none")}</span> : null}
    </div></fieldset>
    <label className="form-field"><strong>{t("experiment")}</strong><textarea name="experimentDescription" required rows={7} maxLength={8000} placeholder={t("experimentPlaceholder")} /></label>
    <fieldset><legend><strong>{t("training")}</strong></legend><div style={{ display: "flex", gap: "1.25rem", marginTop: ".75rem", flexWrap: "wrap" }}>
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><input type="radio" name="training" checked={trainingRequired === true} onChange={() => setTrainingRequired(true)} /> {t("trainingRequired")}</label>
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><input type="radio" name="training" checked={trainingRequired === false} onChange={() => setTrainingRequired(false)} /> {t("trainingNotRequired")}</label>
    </div></fieldset>
    <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : null}
    <div><button className="btn btn-basic" disabled={busy || !instruments.length}>{busy ? t("submitting") : t("submit")}</button></div>
  </form>;
}

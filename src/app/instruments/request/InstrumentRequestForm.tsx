"use client";

import { useState } from "react";

type Instrument = { id: string; name: string; isAvailable: boolean };

export default function InstrumentRequestForm({ instruments, initialInstrumentId }: { instruments: Instrument[]; initialInstrumentId?: string }) {
  const [selected, setSelected] = useState<string[]>(initialInstrumentId && instruments.some((item) => item.id === initialInstrumentId) ? [initialInstrumentId] : []);
  const [trainingRequired, setTrainingRequired] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected.length) return setError("Select at least one instrument.");
    if (trainingRequired === null) return setError("Indicate whether training is required.");
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
      if (!response.ok) throw new Error(data.error || "Could not submit request.");
      setSuccess(true);
      event.currentTarget.reset();
      setSelected([]);
      setTrainingRequired(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit request.");
    } finally { setBusy(false); }
  };

  if (success) return <div className="card" data-edit-ignore="true"><h2>Request submitted</h2><p>The lab has received your request. An administrator will contact you at the email address provided.</p><button className="btn btn-muted" onClick={() => setSuccess(false)}>Submit Another Request</button></div>;

  return <form onSubmit={submit} className="card instrument-request-form" data-edit-ignore="true">
    <label className="form-field"><strong>Name *</strong><input name="name" autoComplete="name" required maxLength={160} /></label>
    <label className="form-field"><strong>Department *</strong><input name="department" required maxLength={240} /></label>
    <label className="form-field"><strong>Supervisor <span className="muted">(if applicable)</span></strong><input name="supervisor" maxLength={240} /></label>
    <label className="form-field"><strong>Email *</strong><input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <fieldset><legend><strong>Instrument(s) requested *</strong></legend><div style={{ display: "grid", gap: ".6rem", marginTop: ".75rem" }}>
      {instruments.map((instrument) => <label key={instrument.id} style={{ display: "flex", alignItems: "center", gap: ".6rem" }}><input type="checkbox" checked={selected.includes(instrument.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, instrument.id] : current.filter((id) => id !== instrument.id))} /> {instrument.name} {!instrument.isAvailable ? <span className="muted">(currently unavailable)</span> : null}</label>)}
      {!instruments.length ? <span className="muted">No instruments are currently listed.</span> : null}
    </div></fieldset>
    <label className="form-field"><strong>Experiment and Sample Description *</strong><textarea name="experimentDescription" required rows={7} maxLength={8000} placeholder="Describe the experiment, samples, and intended use of the instrument(s)." /></label>
    <fieldset><legend><strong>Training *</strong></legend><div style={{ display: "flex", gap: "1.25rem", marginTop: ".75rem", flexWrap: "wrap" }}>
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><input type="radio" name="training" checked={trainingRequired === true} onChange={() => setTrainingRequired(true)} /> Training required</label>
      <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><input type="radio" name="training" checked={trainingRequired === false} onChange={() => setTrainingRequired(false)} /> Training not required</label>
    </div></fieldset>
    <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : null}
    <div><button className="btn btn-basic" disabled={busy || !instruments.length}>{busy ? "Submitting…" : "Submit Access Request"}</button></div>
  </form>;
}

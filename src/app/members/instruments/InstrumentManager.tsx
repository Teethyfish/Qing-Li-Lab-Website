"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Instrument = {
  id: string;
  name: string;
  description: string;
  location: string;
  imageUrl: string;
  isAvailable: boolean;
};

type AccessRequest = {
  id: string;
  name: string;
  department: string;
  supervisor: string | null;
  email: string;
  instruments: string[];
  experimentDescription: string;
  trainingRequired: boolean;
  createdAt: string;
};

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Choose an image file."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("Choose an image smaller than 10 MB."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not open that image."));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL("image/jpeg", 0.84);
        if (result.length >= 2_000_000) return reject(new Error("The compressed image is still too large. Choose a smaller image."));
        resolve(result);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function InstrumentManager({ instruments, requests }: { instruments: Instrument[]; requests: AccessRequest[] }) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!imageUrl) return setError("Choose an instrument image.");
    setBusy("create");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          location: form.get("location"),
          imageUrl,
          isAvailable: form.get("isAvailable") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add instrument.");
      event.currentTarget.reset();
      setImageUrl("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add instrument.");
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (instrument: Instrument) => {
    setBusy(instrument.id);
    setError(null);
    try {
      const response = await fetch(`/api/instruments/${instrument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !instrument.isAvailable }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update availability.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update availability.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (instrument: Instrument) => {
    if (!confirm(`Delete ${instrument.name}? Existing request records will be retained.`)) return;
    setBusy(instrument.id);
    setError(null);
    try {
      const response = await fetch(`/api/instruments/${instrument.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete instrument.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete instrument.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-edit-ignore="true" style={{ display: "grid", gap: "2rem" }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add an instrument</h2>
        <form onSubmit={handleCreate} style={{ display: "grid", gap: "1rem" }}>
          <label className="form-field"><strong>Instrument name</strong><input name="name" required maxLength={160} /></label>
          <label className="form-field"><strong>Image</strong><input type="file" accept="image/*" required={!imageUrl} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return setImageUrl("");
            try { setImageUrl(await resizeImage(file)); setError(null); }
            catch (caught) { setImageUrl(""); setError(caught instanceof Error ? caught.message : "Could not process image."); }
          }} /></label>
          {imageUrl ? <img src={imageUrl} alt="Instrument preview" style={{ width: 240, height: 150, objectFit: "cover", border: "1px solid #d1d5db" }} /> : null}
          <label className="form-field"><strong>Description</strong><textarea name="description" rows={5} required maxLength={5000} /></label>
          <label className="form-field"><strong>Location</strong><input name="location" required maxLength={300} /></label>
          <label style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><input name="isAvailable" type="checkbox" defaultChecked /> Available now</label>
          <button className="btn btn-basic" disabled={busy === "create"}>{busy === "create" ? "Adding…" : "Add Instrument"}</button>
        </form>
        {error ? <p role="alert" style={{ color: "#b91c1c" }}>{error}</p> : null}
      </section>

      <section>
        <h2>Current instruments</h2>
        <div className="instrument-grid">
          {instruments.map((instrument) => <article className="card" key={instrument.id}>
            <img src={instrument.imageUrl} alt={instrument.name} className="instrument-image" />
            <div style={{ paddingTop: "1rem" }}>
              <span className={`status-label ${instrument.isAvailable ? "available" : "unavailable"}`}>{instrument.isAvailable ? "Available" : "Unavailable"}</span>
              <h3>{instrument.name}</h3>
              <p>{instrument.description}</p>
              <p><strong>Location:</strong> {instrument.location}</p>
              <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                <button className="btn btn-muted" disabled={busy === instrument.id} onClick={() => toggle(instrument)}>Mark {instrument.isAvailable ? "Unavailable" : "Available"}</button>
                <button className="btn btn-warning" disabled={busy === instrument.id} onClick={() => remove(instrument)}>Delete</button>
              </div>
            </div>
          </article>)}
          {!instruments.length ? <p className="muted">No instruments have been added yet.</p> : null}
        </div>
      </section>

      <section id="access-requests" style={{ scrollMarginTop: 90 }}>
        <h2>Instrument access requests</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {requests.map((request) => <article className="card" key={request.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{request.name}</h3>
              <time className="muted">{new Date(request.createdAt).toLocaleString()}</time>
            </div>
            <p><strong>Email:</strong> <a href={`mailto:${request.email}`}>{request.email}</a><br />
              <strong>Department:</strong> {request.department}<br />
              <strong>Supervisor:</strong> {request.supervisor || "Not provided"}<br />
              <strong>Instrument(s):</strong> {request.instruments.join(", ")}<br />
              <strong>Training:</strong> {request.trainingRequired ? "Required" : "Not required"}</p>
            <p style={{ whiteSpace: "pre-wrap" }}><strong>Experiment and samples:</strong><br />{request.experimentDescription}</p>
          </article>)}
          {!requests.length ? <p className="muted">No access requests have been submitted.</p> : null}
        </div>
      </section>
    </div>
  );
}

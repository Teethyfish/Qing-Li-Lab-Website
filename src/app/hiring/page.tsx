export default function HiringPage() {
  return (
    <main style={{ maxWidth: 900, display: "grid", gap: "1.5rem" }}>
      <header>
        <h1>Hiring and Expert Opportunities</h1>
        <p className="muted">Opportunities with the Qing X. Li Lab and Proteomics Core Facility.</p>
      </header>
      <section className="card" style={{ padding: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Current Openings</h2>
        <p>We are not currently seeking new laboratory members or external experts.</p>
        <p>
          Future opportunities will be posted here. For general inquiries about potential positions or
          scientific collaboration, please contact Principal Investigator Qing X. Li at{" "}
          <a href="mailto:qingl@hawaii.edu">qingl@hawaii.edu</a>.
        </p>
      </section>
    </main>
  );
}

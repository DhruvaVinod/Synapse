import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflowX: "hidden" }}>
      <div className="grid-overlay" />

      {/* Glow blobs */}
      <div style={{ position: "fixed", top: "10%", left: "15%", width: 600, height: 600, background: "radial-gradient(circle, rgba(0,100,200,0.1) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "10%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "56px 40px" }}>

        {/* Header nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 80 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #0f4c81, rgba(0,212,255,0.2))", border: "1px solid rgba(0,212,255,0.4)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(0,212,255,0.25)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
                <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10M2 12h20"/><path d="M12 2v20"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>Synapse</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Smart Resource Allocation</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/register" className="btn-primary">Report a Need</Link>
            <Link to="/admin" className="btn-ghost">Admin</Link>
          </div>
        </div>

        {/* Hero — single focused block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 720, margin: "0 auto 80px" }} className="animate-fade-up">

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 100, marginBottom: 28 }}>
            <div className="live-dot" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase" }}>System Active</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(42px, 6vw, 72px)", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 24, background: "linear-gradient(135deg, #e8f0fe 0%, #7db8e8 60%, #00d4ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Data-Driven<br />Volunteer<br />Coordination
          </h1>

          <p style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 40, maxWidth: 560 }}>
            Synapse helps local groups and NGOs turn scattered community reports into clear, urgent action. Report needs, track what's happening, and connect the right volunteers to the right places — fast.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <Link to="/register" className="btn-primary" style={{ padding: "14px 28px", fontSize: 15 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              Report a Community Need
            </Link>
            <Link to="/complaints" className="btn-ghost" style={{ padding: "14px 28px", fontSize: 15 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
              View Live Map
            </Link>
            <Link to="/volunteers" className="btn-ghost" style={{ padding: "14px 28px", fontSize: 15, borderColor: "rgba(0,212,255,0.25)", color: "var(--cyan)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              Join as Volunteer
            </Link>
          </div>
        </div>

        {/* Simple 3-step explainer — no tech jargon */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="animate-fade-up-2">
          {[
            {
              step: "01",
              color: "#00d4ff",
              title: "Report a Need",
              text: "Anyone — citizens, NGO field workers, or survey teams — can submit a community need in their own language, by voice or text.",
            },
            {
              step: "02",
              color: "#f59e0b",
              title: "We Score Urgency",
              text: "Synapse automatically reads the report, figures out how urgent it is, and shows it on a live map so coordinators can see the biggest problems first.",
            },
            {
              step: "03",
              color: "#10d470",
              title: "Volunteers Get Matched",
              text: "The right volunteers — matched by their skills and location — are connected to the need. Resources like food, medicines, and vehicles are tracked in real time.",
            },
          ].map((item) => (
            <div key={item.step} className="syn-card" style={{ padding: 28 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: item.color, letterSpacing: "0.15em", marginBottom: 14 }}>STEP {item.step}</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginBottom: 12, color: "var(--text-primary)" }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.75 }}>{item.text}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default HomePage;
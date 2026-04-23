import { Link } from "react-router-dom";

const highlights = [
  {
    color: "#00d4ff",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Community Need Intake",
    text: "Convert scattered reports into structured needs with multilingual text, voice, and location capture.",
  },
  {
    color: "#f59e0b",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "Volunteer Matching",
    text: "Surface the best-fit volunteers using skills, availability, urgency, and proximity-oriented logic.",
  },
  {
    color: "#10d470",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10d470" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: "Resource Coordination",
    text: "Track food, medicines, vehicles, funds, and support tasks from detection to completion.",
  },
];

const services = [
  "Need detection",
  "Urgency scoring",
  "Volunteer matching",
  "Resource coordination",
  "Live tracking",
];

function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative", overflowX: "hidden" }}>
      <div className="grid-overlay" />

      {/* Glow blobs */}
      <div style={{
        position: "fixed", top: "10%", left: "15%",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(0,100,200,0.1) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10%", right: "10%",
        width: 400, height: 400,
        background: "radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "56px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 72 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg, #0f4c81, rgba(0,212,255,0.2))",
              border: "1px solid rgba(0,212,255,0.4)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(0,212,255,0.25)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
                <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10M2 12h20"/>
                <path d="M12 2v20"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>Synapse</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Smart Resource Allocation</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/register" className="btn-primary">
              Report a Need
            </Link>
            <Link to="/admin" className="btn-ghost">
              Admin
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center", marginBottom: 80 }}>
          <div className="animate-fade-up">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 100, marginBottom: 24 }}>
              <div className="live-dot" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--cyan)", letterSpacing: "0.12em", textTransform: "uppercase" }}>System Active</span>
            </div>

            <h1 style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(42px, 6vw, 72px)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
              background: "linear-gradient(135deg, #e8f0fe 0%, #7db8e8 60%, #00d4ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Data-Driven<br />Volunteer<br />Coordination
            </h1>

            <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: 480, marginBottom: 36 }}>
              Synapse reframes the old grievance workflow into a live community response system. Capture needs, score urgency, suggest resource requirements, visualize hotspots, and coordinate volunteers and NGOs from a single interface.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link to="/register" className="btn-primary" style={{ padding: "13px 24px", fontSize: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                Report a Community Need
              </Link>
              <Link to="/complaints" className="btn-ghost" style={{ padding: "13px 24px", fontSize: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                Live Heatmap
              </Link>
              <Link to="/volunteers" className="btn-ghost" style={{ padding: "13px 24px", fontSize: 14, borderColor: "rgba(0,212,255,0.25)", color: "var(--cyan)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Volunteer Hub
              </Link>
            </div>
          </div>

          {/* Info card */}
          <div className="animate-fade-up-2 syn-card" style={{ padding: 0 }}>
            <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="mono-label" style={{ marginBottom: 12 }}>Platform Capabilities</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {services.map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: i % 2 === 0 ? "var(--cyan-dim)" : "rgba(59,130,246,0.1)",
                      border: "1px solid " + (i % 2 === 0 ? "rgba(0,212,255,0.25)" : "rgba(59,130,246,0.2)"),
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={i % 2 === 0 ? "#00d4ff" : "#60a5fa"} strokeWidth="2">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "18px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Response", value: "Real-time", color: "var(--green)" },
                  { label: "Languages", value: "10+", color: "var(--cyan)" },
                  { label: "Mapping", value: "Live GPS", color: "var(--amber)" },
                ].map((m) => (
                  <div key={m.label} style={{ textAlign: "center", padding: "12px 8px", background: "var(--bg-layer1)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: m.color }}>{m.value}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {highlights.map((item, i) => (
            <div key={item.title} className={`syn-card animate-fade-up-${i + 2}`} style={{ padding: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${item.color}15`,
                border: `1px solid ${item.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
                boxShadow: `0 0 16px ${item.color}15`,
              }}>
                {item.icon}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 10, color: "var(--text-primary)" }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
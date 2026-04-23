import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Report Community Need",
    to: "/register",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
      </svg>
    ),
    label: "Live Need Heatmap",
    to: "/complaints",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Track Action Status",
    to: "/track",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    label: "Volunteer Hub",
    to: "/volunteers",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    label: "Resource & Alerts",
    to: "/coordination",
  },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="syn-sidebar">
      {/* Branding */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #0f4c81, #00d4ff22)",
            border: "1px solid rgba(0,212,255,0.35)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 12px rgba(0,212,255,0.2)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
              <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10M12 22a10 10 0 0 1-10-10M2 12h20"/>
              <path d="M12 2v20"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Synapse
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cyan)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 1 }}>
              SRA Platform
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
          Data-driven volunteer coordination for social impact
        </p>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <div className="mono-label" style={{ padding: "0 4px", marginBottom: 8 }}>Operations</div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `syn-nav-link${isActive ? " active" : ""}`}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        <div style={{ height: 1, background: "var(--border-subtle)", margin: "12px 4px" }} />
        <div className="mono-label" style={{ padding: "0 4px", marginBottom: 8 }}>Admin</div>
        <NavLink
          to="/admin"
          className={() =>
            `syn-nav-link${location.pathname.startsWith("/admin") ? " active" : ""}`
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Coordination Dashboard
        </NavLink>
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="live-dot" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
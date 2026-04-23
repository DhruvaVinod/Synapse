import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";
const RESOURCE_KEY = "synapse-resources";

const INITIAL_RESOURCES = [
  { id: 1, name: "Food Kits", available: 120, location: "Central Warehouse", usage: 38, color: "var(--amber)" },
  { id: 2, name: "Medicines", available: 64, location: "Clinic Storage", usage: 21, color: "var(--red)" },
  { id: 3, name: "Vehicles", available: 8, location: "Transport Yard", usage: 5, color: "var(--cyan)" },
  { id: 4, name: "Relief Funds", available: 250000, location: "Emergency Pool", usage: 92000, color: "var(--green)" },
];

const NEED_KEYWORDS = {
  Health: ["Medicines", "Vehicles"],
  Sanitation: ["Food Kits"],
  Water: ["Vehicles"],
  Electricity: ["Vehicles"],
  Roads: ["Vehicles"],
  General: ["Food Kits", "Relief Funds"],
};

function CoordinationCenterPage() {
  const [needs, setNeeds] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    const savedVols = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(savedVols) ? savedVols : []);
    const savedRes = JSON.parse(localStorage.getItem(RESOURCE_KEY) || "null");
    if (Array.isArray(savedRes) && savedRes.length > 0) {
      setResources(savedRes.map((r, i) => ({ ...r, color: INITIAL_RESOURCES[i]?.color || "var(--cyan)" })));
    } else {
      localStorage.setItem(RESOURCE_KEY, JSON.stringify(INITIAL_RESOURCES));
      setResources(INITIAL_RESOURCES);
    }
  }, []);

  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/complaints`);
        setNeeds(Array.isArray(res.data) ? res.data : []);
      } catch { setNeeds([]); }
    };
    fetchNeeds();
    const id = setInterval(fetchNeeds, 15000);
    return () => clearInterval(id);
  }, []);

  const alerts = useMemo(() =>
    needs.filter((item) => item.priority === "High" || item.status === "Pending").slice(0, 6)
      .map((item) => ({
        id: String(item._id || item.id), title: item.category || "Community Need",
        text: item.text, location: item.location,
        level: item.priority === "High" ? "Urgent" : "Watch",
        isUrgent: item.priority === "High",
      })), [needs]);

  const resourceSuggestions = useMemo(() => {
    const counter = {};
    needs.forEach((item) => {
      const names = NEED_KEYWORDS[item.category] || ["Food Kits"];
      names.forEach((name) => { counter[name] = (counter[name] || 0) + (item.priority === "High" ? 3 : item.priority === "Medium" ? 2 : 1); });
    });
    return Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [needs]);

  const STATS = [
    { label: "Active Alerts", value: alerts.length, color: "var(--red)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { label: "Tracked Resources", value: resources.length, color: "var(--cyan)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
    { label: "Volunteer Pool", value: volunteers.length, color: "var(--green)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { label: "High Priority Needs", value: needs.filter(n => n.priority === "High").length, color: "var(--amber)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div className="live-dot" />
            <span className="mono-label">Live · Refreshes every 15s</span>
          </div>
          <h1 className="page-title">Resource & Alerts Center</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--bg-layer2)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>FEED ONLINE</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-accent" style={{ background: s.color }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <span className="stat-label">{s.label}</span>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Resources */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div className="section-title" style={{ fontSize: 15 }}>Resource Layer</div>
            <span className="badge badge-cyan">{resources.length} items</span>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {resources.map((res) => {
              const pct = Math.min(100, (res.usage / Math.max(res.available, 1)) * 100);
              return (
                <div key={res.id} className="resource-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{res.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{res.location}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18, color: res.color || "var(--cyan)" }}>{res.available.toLocaleString()}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>available</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${res.color || "var(--cyan)"}, ${res.color || "var(--cyan)"}88)` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Used: {res.usage.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: res.color || "var(--cyan)", fontFamily: "var(--font-mono)" }}>{Math.round(pct)}%</span>
                  </div>
                </div>
              );
            })}

            {/* Resource priority suggestions */}
            {resourceSuggestions.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div className="mono-label" style={{ marginBottom: 10 }}>Demand Priority Scores</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {resourceSuggestions.map(([name, score]) => (
                    <div key={name} style={{ padding: "10px 12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{name}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--cyan)" }}>{score}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>priority score</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="section-title" style={{ fontSize: 15 }}>Live Alerts</div>
              {alerts.length > 0 && <span className="badge badge-red">{alerts.length} active</span>}
            </div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, maxHeight: 560, overflowY: "auto" }}>
            {alerts.length === 0 && (
              <div style={{ padding: 28, textAlign: "center", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No urgent alerts right now.</p>
              </div>
            )}
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{alert.title}</div>
                  <span className={`badge ${alert.isUrgent ? "badge-red" : "badge-amber"}`}>{alert.level}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{alert.text}</p>
                {alert.location && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{alert.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoordinationCenterPage;
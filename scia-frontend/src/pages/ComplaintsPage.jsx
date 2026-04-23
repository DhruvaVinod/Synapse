import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";

const NEED_TYPE_COLORS = {
  Water:       { fill: "#00d4ff", border: "#0099bb" },
  Electricity: { fill: "#f59e0b", border: "#c77a00" },
  Roads:       { fill: "#7b97c4", border: "#4a6090" },
  Sanitation:  { fill: "#10d470", border: "#0aaa58" },
  Health:      { fill: "#ff4d6a", border: "#cc2040" },
  General:     { fill: "#8b5cf6", border: "#6030c0" },
};

const URGENCY_SIZE = {
  High:   { radius: 16, opacity: 0.9 },
  Medium: { radius: 11, opacity: 0.72 },
  Low:    { radius: 8,  opacity: 0.5 },
};

function mapStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function getMarkerStyle(category, priority) {
  const color = NEED_TYPE_COLORS[category] || NEED_TYPE_COLORS.General;
  const size = URGENCY_SIZE[priority] || URGENCY_SIZE.Medium;
  return { fillColor: color.fill, color: color.border, fillOpacity: size.opacity, radius: size.radius, weight: 1.5 };
}

function matchSkills(category) {
  const map = { Health: ["Medical"], Sanitation: ["Logistics"], Water: ["Logistics","Driving"], Electricity: ["Logistics"], Roads: ["Rescue","Driving"], General: ["Teaching","Survey Collection"] };
  return map[category] || ["Logistics"];
}

function ComplaintsPage() {
  const [needs, setNeeds] = useState([]);
  const [needTypeFilter, setNeedTypeFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/complaints`).then((res) => setNeeds(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    const saved = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(saved) ? saved : []);
  }, []);

  const needTypes = useMemo(() => { const s = new Set(["All"]); needs.forEach((n) => s.add(n.category || "General")); return [...s]; }, [needs]);
  const validNeeds = useMemo(() => needs.filter((n) => n.lat && n.lng && !isNaN(+n.lat) && !isNaN(+n.lng)), [needs]);

  const enrichedNeeds = useMemo(() => validNeeds.map((item) => {
    const required = matchSkills(item.category);
    const matched = volunteers.filter((v) => v.skills?.some((s) => required.includes(s)));
    return { ...item, displayStatus: mapStatus(item), matchedVolunteers: matched, volunteerDensity: matched.length };
  }), [validNeeds, volunteers]);

  const filtered = useMemo(() => enrichedNeeds.filter((n) => {
    const typeOk = needTypeFilter === "All" || n.category === needTypeFilter;
    const urgencyOk = urgencyFilter === "All" || n.priority === urgencyFilter;
    return typeOk && urgencyOk;
  }), [enrichedNeeds, needTypeFilter, urgencyFilter]);

  const mapCenter = useMemo(() => filtered.length > 0 ? [+filtered[0].lat, +filtered[0].lng] : [20.5937, 78.9629], [filtered]);

  const hotspotSummary = useMemo(() => {
    const counts = {};
    filtered.forEach((n) => { const k = n.location || "Unknown Area"; counts[k] = (counts[k] || 0) + (n.priority === "High" ? 3 : n.priority === "Medium" ? 2 : 1); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [filtered]);

  const urgencyBadgeClass = (u) => u === "High" ? "badge-red" : u === "Medium" ? "badge-amber" : "badge-green";
  const statusBadgeClass = (s) => s === "Completed" ? "badge-green" : s === "In Progress" ? "badge-blue" : "badge-amber";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="live-dot" />
          <span className="mono-label">Live Intelligence</span>
        </div>
        <h1 className="page-title">Live Need Heatmap</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          Colour = need type · Size = urgency · Density = matched volunteer count
        </p>
      </div>

      {/* Map Card */}
      <div className="syn-card" style={{ padding: 0 }}>
        {/* Filters */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="mono-label" style={{ marginBottom: 0 }}>Type</span>
            {needTypes.map((t) => (
              <button key={t} onClick={() => setNeedTypeFilter(t)} className={`filter-pill${needTypeFilter === t ? " active" : ""}`}>{t}</button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono-label" style={{ marginBottom: 0 }}>Urgency</span>
            {["All","High","Medium","Low"].map((u) => (
              <button key={u} onClick={() => setUrgencyFilter(u)} className={`filter-pill${urgencyFilter === u ? " active" : ""}`}>{u}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            {filtered.length}/{validNeeds.length} needs
          </div>
        </div>

        {/* Map + Sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 0 }}>
          <div style={{ height: 520, borderRight: "1px solid var(--border-subtle)" }}>
            <MapContainer center={mapCenter} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map((item) => {
                const style = getMarkerStyle(item.category, item.priority);
                const id = String(item._id || item.id);
                return (
                  <CircleMarker key={id} center={[+item.lat, +item.lng]} {...style}>
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.97}>
                      <div style={{ fontFamily: "system-ui", fontSize: 12 }}>
                        <strong>{item.category}</strong> · {item.priority}
                        <div style={{ opacity: 0.75, marginTop: 2 }}>{item.volunteerDensity} volunteers matched</div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: 200, fontFamily: "system-ui" }}>
                        <div style={{ fontWeight: 700, color: style.fillColor, marginBottom: 4 }}>{item.category}</div>
                        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.priority} · {item.displayStatus}</div>
                        <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Ref #{id.slice(-6)}</div>
                        <p style={{ marginTop: 8, fontSize: 13, borderTop: "1px solid #eee", paddingTop: 8 }}>{item.text}</p>
                        <div style={{ fontSize: 11, color: "#888" }}>{item.location}</div>
                        <div style={{ marginTop: 8, fontSize: 11 }}>Matched volunteers: {item.volunteerDensity}</div>
                        <a href={`/track?ref=${id.slice(-6)}`} style={{ display: "block", marginTop: 8, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>Track action →</a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="mono-label" style={{ marginBottom: 10 }}>Clustered Problem Zones</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hotspotSummary.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No hotspot data.</p>}
                {hotspotSummary.map(([location, score]) => (
                  <div key={location} style={{ padding: "10px 12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{location}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: "var(--bg-layer3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, score * 8)}%`, background: "var(--red)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)" }}>{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div className="mono-label" style={{ marginBottom: 10 }}>Volunteer Density</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.slice(0, 5).map((item) => (
                  <div key={String(item._id || item.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{item.category}</span>
                    <span className="badge badge-cyan">{item.volunteerDensity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Need Board */}
      <div className="syn-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="section-title">Need Board</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{filtered.length} entries</span>
        </div>

        <div style={{ padding: 16, maxHeight: 560, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && (
            <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>No needs match the current filters.</p>
          )}
          {filtered.map((item) => {
            const id = String(item._id || item.id);
            const color = NEED_TYPE_COLORS[item.category] || NEED_TYPE_COLORS.General;
            return (
              <div key={id} className="need-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.fill, boxShadow: `0 0 6px ${color.fill}` }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{item.category || "General"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>#{id.slice(-6)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className={`badge ${urgencyBadgeClass(item.priority)}`}>{item.priority}</span>
                    <span className={`badge ${statusBadgeClass(item.displayStatus)}`}>{item.displayStatus}</span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 10 }}>{item.text}</p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {matchSkills(item.category).map((s) => <span key={s} className="syn-tag">{s}</span>)}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {item.location}</span>
                  </div>
                  <Link to={`/track?ref=${id.slice(-6)}`} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", textDecoration: "none", whiteSpace: "nowrap" }}>
                    Track →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ComplaintsPage;
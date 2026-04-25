import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";

const API_BASE_URL = "http://localhost:5001";

const NEED_TYPE_COLORS = {
  Water:             { fill: "#00d4ff", border: "#0099bb" },
  Electricity:       { fill: "#f59e0b", border: "#c77a00" },
  Roads:             { fill: "#7b97c4", border: "#4a6090" },
  Sanitation:        { fill: "#10d470", border: "#0aaa58" },
  Health:            { fill: "#ff4d6a", border: "#cc2040" },
  "Disaster Relief": { fill: "#ff8c42", border: "#cc6010" },
  "Elderly Support": { fill: "#c084fc", border: "#9050d0" },
  Medical:           { fill: "#f43f5e", border: "#be123c" },
  Food:              { fill: "#84cc16", border: "#4d7c0f" },
  Shelter:           { fill: "#fb923c", border: "#c2410c" },
  General:           { fill: "#8b5cf6", border: "#6030c0" },
};

const URGENCY_SIZE = {
  High:   { radius: 16, opacity: 0.9 },
  Medium: { radius: 11, opacity: 0.72 },
  Low:    { radius: 8,  opacity: 0.5 },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str) {
  if (!str) return "General";
  return str.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function mapStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function getMarkerStyle(category, priority) {
  const color = NEED_TYPE_COLORS[category] || NEED_TYPE_COLORS.General;
  const size  = URGENCY_SIZE[priority]  || URGENCY_SIZE.Medium;
  return { fillColor: color.fill, color: color.border, fillOpacity: size.opacity, radius: size.radius, weight: 1.5 };
}

function matchSkills(category) {
  const map = {
    Health:            ["medical"],
    Medical:           ["medical"],
    Sanitation:        ["hygiene"],
    Water:             ["disaster relief"],
    Electricity:       ["disaster relief"],
    Roads:             ["disaster relief"],
    "Disaster Relief": ["disaster relief"],
    "Elderly Support": ["elderly support"],
    Food:              ["food"],
    Shelter:           ["shelter"],
    General:           ["education"],
  };
  return map[category] || ["disaster relief"];
}

function calcHotspotScore(needs) {
  return needs.reduce((sum, n) => sum + (n.priority === "High" ? 3 : n.priority === "Medium" ? 2 : 1), 0);
}

// FIX 3: Locations that should be excluded from hotspot clustering
const UNKNOWN_LOCATION_PATTERNS = [
  /^unknown/i,
  /^n\/a$/i,
  /^na$/i,
  /^none$/i,
  /^-+$/,
  /^\.+$/,
  /^test/i,
];

function isValidLocation(loc) {
  if (!loc || !loc.trim()) return false;
  return !UNKNOWN_LOCATION_PATTERNS.some((rx) => rx.test(loc.trim()));
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ComplaintsPage() {
  const [needs, setNeeds]               = useState([]);
  const [needTypeFilter, setNeedTypeFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter]   = useState("All");
  // FIX 1: volunteers from DB, not localStorage
  const [volunteers, setVolunteers]     = useState([]);
  // FIX 2: track admin status
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    // Fetch needs
    axios
      .get(`${API_BASE_URL}/api/complaints`)
      .then((res) => setNeeds(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

    // FIX 1: Fetch volunteers from DB (same as VolunteerHubPage)
    axios
      .get(`${API_BASE_URL}/api/volunteers`)
      .then((res) => setVolunteers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setVolunteers([]));
  }, []);

  const normalizedNeeds = useMemo(
    () => needs.map((n) => ({ ...n, category: toTitleCase(n.category || "General") })),
    [needs]
  );

  const needTypes = useMemo(() => {
    const s = new Set(["All"]);
    normalizedNeeds.forEach((n) => s.add(n.category));
    return [...s];
  }, [normalizedNeeds]);

  const validNeeds = useMemo(
    () => normalizedNeeds.filter((n) => n.lat && n.lng && !isNaN(+n.lat) && !isNaN(+n.lng)),
    [normalizedNeeds]
  );

  const enrichedNeeds = useMemo(() => {
    return validNeeds.map((item) => {
      // FIX 1: DB skills are lowercase — compare lowercase on both sides
      const required = matchSkills(item.category); // already lowercase
      const matched  = volunteers.filter((v) => {
        const vSkills = (Array.isArray(v.skills) ? v.skills : []).map((s) => s.toLowerCase());
        return required.some((r) => vSkills.includes(r.toLowerCase()));
      });
      return {
        ...item,
        displayStatus:    mapStatus(item),
        matchedVolunteers: matched,
        volunteerDensity:  matched.length,
      };
    });
  }, [validNeeds, volunteers]);

  const filtered = useMemo(() => {
    return enrichedNeeds.filter((n) => {
      const typeOk   = needTypeFilter === "All" || n.category === needTypeFilter;
      const urgencyOk = urgencyFilter === "All" || n.priority === urgencyFilter;
      return typeOk && urgencyOk;
    });
  }, [enrichedNeeds, needTypeFilter, urgencyFilter]);

  const mapCenter = useMemo(
    () => (filtered.length > 0 ? [+filtered[0].lat, +filtered[0].lng] : [20.5937, 78.9629]),
    [filtered]
  );

  // FIX 3: Exclude unknown/blank locations from hotspot summary
  const hotspotSummary = useMemo(() => {
    const groups = {};
    filtered.forEach((n) => {
      const loc = (n.location || "").trim();
      if (!isValidLocation(loc)) return; // ← skip unknown locations
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(n);
    });
    return Object.entries(groups)
      .map(([location, items]) => ({
        location,
        score:     calcHotspotScore(items),
        total:     items.length,
        highCount: items.filter((i) => i.priority === "High").length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [filtered]);

  const volunteerDensityByCategory = useMemo(() => {
    const map = {};
    filtered.forEach((n) => {
      const k = n.category;
      if (!map[k]) map[k] = {
        category:     k,
        totalNeeds:   0,
        totalMatched: 0,
        color:        NEED_TYPE_COLORS[k]?.fill || "#8b5cf6",
      };
      map[k].totalNeeds   += 1;
      map[k].totalMatched += n.volunteerDensity;
    });
    return Object.values(map).sort((a, b) => b.totalNeeds - a.totalNeeds).slice(0, 6);
  }, [filtered]);

  const urgencyBadgeClass = (u) => (u === "High" ? "badge-red" : u === "Medium" ? "badge-amber" : "badge-green");
  const statusBadgeClass  = (s) => (s === "Completed" ? "badge-green" : s === "In Progress" ? "badge-blue" : "badge-amber");
  const maxScore = hotspotSummary[0]?.score || 1;

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
          Colour = need type · Size = urgency 
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
            {["All", "High", "Medium", "Low"].map((u) => (
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
                const id    = String(item._id || item.id);
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
                        {/* FIX 2: Only show assign link to admins */}
                        {isAdmin && (
                          <a href={`/admin/dashboard?assign=${id.slice(-6)}`} style={{ display: "block", marginTop: 6, fontSize: 12, color: "#10d470", fontWeight: 600 }}>
                            Assign volunteer →
                          </a>
                        )}
                        <a href={`/track?ref=${id.slice(-6)}`} style={{ display: "block", marginTop: 4, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
                          Track action →
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", maxHeight: 520 }}>

            {/* Clustered Problem Zones */}
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="mono-label" style={{ marginBottom: 4 }}>Clustered Problem Zones</div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                Score = weighted urgency load<br />
                <span style={{ color: "var(--red)" }}>High=3pts</span> · <span style={{ color: "var(--amber)" }}>Medium=2pts</span> · <span style={{ color: "var(--text-muted)" }}>Low=1pt</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hotspotSummary.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No hotspot data with valid locations.</p>
                )}
                {hotspotSummary.map(({ location, score, total, highCount }) => (
                  <div key={location} style={{ padding: "10px 12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", flex: 1, marginRight: 6 }}>{location}</div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {highCount > 0 && (
                          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", background: "rgba(255,77,106,0.15)", color: "var(--red)", border: "1px solid rgba(255,77,106,0.3)", borderRadius: 10, padding: "1px 5px" }}>
                            {highCount} HIGH
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--bg-layer3)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (score / maxScore) * 100)}%`, background: highCount > 0 ? "var(--red)" : "var(--amber)", borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", fontWeight: 700, minWidth: 28, textAlign: "right" }}>{score}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{total} report{total !== 1 ? "s" : ""} · urgency-weighted</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volunteer Density */}
            <div style={{ padding: "16px 18px" }}>
              <div className="mono-label" style={{ marginBottom: 4 }}>Volunteer–Need Match</div>
              <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
                How many registered volunteers have skills matching each need type
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {volunteerDensityByCategory.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data available.</p>
                )}
                {volunteerDensityByCategory.map(({ category, totalNeeds, totalMatched, color }) => {
                  const ratio = totalNeeds > 0 ? totalMatched / totalNeeds : 0;
                  const coverageStatus =
                    ratio >= 2 ? { label: "Well Covered", c: "var(--green)" }
                    : ratio >= 1 ? { label: "Adequate",   c: "var(--cyan)" }
                    : ratio > 0 ? { label: "Understaffed", c: "var(--amber)" }
                    : { label: "No Match", c: "var(--red)" };
                  return (
                    <div key={category} style={{ padding: "10px 12px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{category}</span>
                        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", background: `${coverageStatus.c}15`, color: coverageStatus.c, border: `1px solid ${coverageStatus.c}40`, borderRadius: 10, padding: "1px 6px" }}>
                          {coverageStatus.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color }}>{totalMatched}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>volunteers</div>
                        </div>
                        <div style={{ width: 1, background: "var(--border-subtle)" }} />
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, color: "var(--text-secondary)" }}>{totalNeeds}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>needs</div>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                          <div style={{ width: "100%", height: 4, background: "var(--bg-layer3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(100, ratio * 50)}%`, background: coverageStatus.c, borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
            const id    = String(item._id || item.id);
            const color = NEED_TYPE_COLORS[item.category] || NEED_TYPE_COLORS.General;
            return (
              <div key={id} className="need-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.fill, boxShadow: `0 0 6px ${color.fill}` }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{item.category}</span>
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link
                      to={`/track?ref=${id.slice(-6)}`}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Track →
                    </Link>
                  </div>
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
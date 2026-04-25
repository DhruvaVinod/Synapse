import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const API_BASE_URL = "http://localhost:5001";
const RESOURCE_KEY = "synapse-resources";

const STATUS_COLORS = { Detected: "#f59e0b", "In Progress": "#00d4ff", Completed: "#10d470" };
const CATEGORY_COLORS = ["#00d4ff","#10d470","#f59e0b","#8b5cf6","#ff4d6a","#7b97c4"];

const DEFAULT_RESOURCES = [
  { id: 1, name: "Food Kits",  available: 120, usage: 38 },
  { id: 2, name: "Medicines",  available: 64,  usage: 21 },
  { id: 3, name: "Vehicles",   available: 8,   usage: 5  },
  { id: 4, name: "Funds",      available: 250000, usage: 92000 },
];

const CATEGORY_ICONS = {
  Health: "🏥", Sanitation: "🧹", Water: "💧", Electricity: "⚡",
  Roads: "🛣️", Food: "🍱", Disaster: "🌊", Shelter: "🏠",
  Education: "📚", General: "📋",
};

function displayStatus(item) {
  if (item.status === "Resolved" || item.status === "Completed") return "Completed";
  if (item.status === "Assigned") return "Assigned";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function getDisplayStatus(item) {
  return displayStatus(item);
}

function inferResources(category, priority) {
  const base = {
    Health: ["Medicines","Vehicles"], Sanitation: ["Food Kits"],
    Water: ["Vehicles"], Electricity: ["Vehicles"], Roads: ["Vehicles"],
    General: ["Funds","Food Kits"],
  };
  const items = base[category] || ["Food Kits"];
  return priority === "High" ? [...items, "Rapid Dispatch"] : items;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CustomTooltipStyle = {
  background: "var(--bg-layer2)", border: "1px solid var(--border-medium)",
  borderRadius: 8, fontSize: 12, padding: "8px 12px",
};

// ── AI match helper ───────────────────────────────────────────────────────────
function localAiMatch(need, volunteers) {
  const needCat = (need.category || "General").toLowerCase();
  const SKILL_MAP = {
    health:            ["medical", "elderly support"],
    medical:           ["medical"],
    food:              ["food"],
    disaster:          ["disaster relief"],
    "disaster relief": ["disaster relief"],
    shelter:           ["shelter"],
    sanitation:        ["hygiene"],
    "elderly support": ["elderly support"],
    education:         ["education"],
    water:             ["disaster relief"],
    electricity:       ["disaster relief"],
    roads:             ["disaster relief"],
  };
  const targetSkills = SKILL_MAP[needCat] || ["disaster relief"];

  return volunteers
    .map((v) => {
      const volSkills = (v.skills || []).map((s) => s.toLowerCase());
      const overlap   = targetSkills.filter((s) => volSkills.includes(s)).length;
      const loadRatio = 1 - (v.current_load || 0) / Math.max(v.max_load || 3, 1);
      const score     = Math.min(1, (overlap / Math.max(targetSkills.length, 1)) * 0.7 + loadRatio * 0.3);
      return { ...v, overlap, score: parseFloat(score.toFixed(2)) };
    })
    .filter((v) => v.score > 0 && (v.current_load || 0) < (v.max_load || 3))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ── Urgent Alert Card ─────────────────────────────────────────────────────────
function UrgentAlertCard({ item, onReply, onComplete, replyText, setReplyText, submitting }) {
  const [expanded, setExpanded] = useState(false);
  const id = String(item._id || item.id);
  const shortId = id.slice(-6);
  const icon = CATEGORY_ICONS[item.category] || "📋";

  return (
    <div style={{
      borderRadius: 10,
      border: "1px solid rgba(255,77,106,0.35)",
      background: "linear-gradient(135deg, rgba(255,77,106,0.07) 0%, rgba(20,27,45,0.9) 100%)",
      transition: "box-shadow 0.2s",
      boxShadow: expanded ? "0 0 16px rgba(255,77,106,0.2)" : "none",
      flexShrink: 0,
    }}>
      <div
        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}
        onClick={() => setExpanded((p) => !p)}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 6px var(--red)", flexShrink: 0 }} />
        <span style={{ fontSize: 15 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{item.category}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", opacity: 0.8 }}>#{shortId}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
            {item.location}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{timeAgo(item.createdAt)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,77,106,0.15)" }} onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 10, marginBottom: 10 }}>{item.text}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {inferResources(item.category, item.priority).map((r) => (
              <span key={r} className="syn-tag" style={{ fontSize: 9 }}>{r}</span>
            ))}
          </div>
          <textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)}
            placeholder="Assign team or add coordinator note…"
            className="syn-input" style={{ fontSize: 11, resize: "none", minHeight: "unset", marginBottom: 8, width: "100%", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onReply(id, false)} disabled={submitting || !replyText?.trim()}
              className="btn-primary" style={{ fontSize: 11, padding: "6px 12px", flex: 1 }}>
              {submitting ? "Sending…" : "Send Update"}
            </button>
            <button onClick={() => onComplete(id)} disabled={submitting}
              className="btn-success" style={{ fontSize: 11, padding: "6px 12px" }}>
              ✓ Resolve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin-only: Assign Volunteers Panel ───────────────────────────────────────
function AssignVolunteersPanel({ needs, volunteers, onAssigned }) {
  const [needFilter, setNeedFilter]     = useState("All");
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [matches, setMatches]           = useState([]);
  const [matching, setMatching]         = useState(false);
  const [assignedMap, setAssignedMap]   = useState({});

  const activeNeeds = useMemo(
    () => needs.filter((n) => getDisplayStatus(n) !== "Completed"),
    [needs]
  );

  const filtered = needFilter === "All"
    ? activeNeeds
    : activeNeeds.filter((n) => n.priority === needFilter);

  const handleSelect = useCallback(async (need) => {
    setSelectedNeed(need);
    setMatching(true);
    setMatches([]);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/coordination/match/${String(need._id || need.id)}`);
      if (res.data?.matches?.length) { setMatches(res.data.matches); setMatching(false); return; }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
    setMatches(localAiMatch(need, volunteers));
    setMatching(false);
  }, [volunteers]);

  const handleAssign = useCallback(async (need, vol) => {
    const needId = String(need._id || need.id);
    const volId  = String(vol._id || vol.volunteer_id);
    try {
      await axios.post(`${API_BASE_URL}/api/coordination/assign`, {
        needId,
        volunteerIds: [volId],
      });
    } catch (err) {
      console.error("Assign failed:", err);
    }
    setAssignedMap((p) => ({ ...p, [needId]: vol }));
    onAssigned?.();
  }, [onAssigned]);

  const uColor = (u) => u === "High" ? "var(--red)" : u === "Medium" ? "var(--amber)" : "var(--green)";

  return (
    <div className="syn-card" style={{ padding: 0 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="section-title">Assign Volunteers to Needs</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{activeNeeds.length} open</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["All", "High", "Medium", "Low"].map((f) => (
            <button key={f} onClick={() => setNeedFilter(f)} style={{
              padding: "4px 10px", borderRadius: 20, fontSize: 10, cursor: "pointer",
              fontFamily: "var(--font-mono)", fontWeight: 600,
              background: needFilter === f ? "rgba(0,212,255,0.15)" : "transparent",
              border: `1px solid ${needFilter === f ? "rgba(0,212,255,0.4)" : "var(--border-subtle)"}`,
              color: needFilter === f ? "var(--cyan)" : "var(--text-muted)",
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 420 }}>
        {/* Left: need list */}
        <div style={{ borderRight: "1px solid var(--border-subtle)", overflowY: "auto", maxHeight: 520 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No open needs.</p>
            </div>
          )}
          {filtered.map((need) => {
            const id       = String(need._id || need.id);
            const shortId  = id.slice(-6);
            const assigned = assignedMap[id];
            const isSelected = selectedNeed && String(selectedNeed._id || selectedNeed.id) === id;
            return (
              <div key={id} onClick={() => handleSelect(need)} style={{
                padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer",
                background: isSelected ? "rgba(0,212,255,0.07)" : "transparent",
                borderLeft: `3px solid ${isSelected ? "var(--cyan)" : uColor(need.priority)}`,
                transition: "background 0.15s",
              }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-layer1)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {need.category}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>#{shortId}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{need.location}</div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: "2px 7px", borderRadius: 20,
                    background: `${uColor(need.priority)}15`, border: `1px solid ${uColor(need.priority)}40`,
                    color: uColor(need.priority), fontFamily: "var(--font-mono)", fontWeight: 700, whiteSpace: "nowrap",
                  }}>{(need.priority || "—").toUpperCase()}</span>
                </div>
                {assigned && (
                  <div style={{ marginTop: 6, fontSize: 10, color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
                    ✅ <strong>{assigned.name}</strong> assigned
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: AI matches */}
        <div style={{ padding: 16, overflowY: "auto", maxHeight: 520 }}>
          {!selectedNeed && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, opacity: 0.5 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                Select a need on the left to see AI-matched volunteers
              </p>
            </div>
          )}

          {selectedNeed && (
            <>
              <div className="mono-label" style={{ marginBottom: 4, color: "var(--cyan)" }}>🤖 Best-Fit Volunteers</div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Ranked by skill match + available capacity</p>

              {matching && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "var(--text-muted)", fontSize: 12 }}>
                  <svg style={{ animation: "spin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Analyzing volunteer pool…
                </div>
              )}

              {!matching && matches.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No available volunteers match this need's skills.</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Try registering more volunteers in the Volunteer Hub.</p>
                </div>
              )}

              {!matching && matches.map((vol, i) => {
                const needId     = String(selectedNeed._id || selectedNeed.id);
                const isAssigned = assignedMap[needId]?._id === vol._id;
                const loadColor  = (vol.current_load || 0) >= (vol.max_load || 3) ? "var(--red)" : "var(--green)";
                return (
                  <div key={vol._id || vol.volunteer_id || i} style={{
                    padding: "12px 14px", marginBottom: 10,
                    background: isAssigned ? "rgba(16,212,112,0.07)" : "var(--bg-layer2)",
                    border: `1px solid ${isAssigned ? "rgba(16,212,112,0.35)" : "var(--border-subtle)"}`,
                    borderRadius: 10,
                  }}>
                    {/* NAME + PHONE ROW */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        {vol.name || "Unknown"}
                      </span>
                      {vol.phone && (
                        <a href={`tel:${vol.phone}`} style={{ fontSize: 11, color: "var(--cyan)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
                          📞 {vol.phone}
                        </a>
                      )}
                    </div>

                    {/* SKILL TAGS */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {(Array.isArray(vol.skills)
                        ? vol.skills
                        : (typeof vol.skills === 'string' ? vol.skills.split(',') : [])
                      ).map((s, index) => (
                        <span key={index} className="syn-tag" style={{ fontSize: 9, textTransform: "capitalize" }}>
                          {s.trim()}
                        </span>
                      ))}
                    </div>

                    {/* STATS ROW */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        <span>
                          Load: <span style={{ color: loadColor, fontWeight: 700 }}>{vol.current_load || 0}/{vol.max_load || 3}</span>
                        </span>
                        <span>⭐ {(vol.rating || 5.0).toFixed(1)}</span>
                        {vol.distance_km != null && (
                          <span>📍 {Number(vol.distance_km).toFixed(1)} km</span>
                        )}
                        {vol.hybrid_match_score != null && (
                          <span style={{ color: "var(--cyan)" }}>🎯 {vol.hybrid_match_score}</span>
                        )}
                      </div>

                      {isAssigned ? (
                        <span style={{ fontSize: 10, color: "var(--green)", fontWeight: 700 }}>✅ Assigned</span>
                      ) : (
                        <button onClick={() => handleAssign(selectedNeed, vol)} style={{
                          fontSize: 11, padding: "5px 12px",
                          background: "rgba(16,212,112,0.1)", border: "1px solid rgba(16,212,112,0.35)",
                          color: "var(--green)", borderRadius: 6, cursor: "pointer", fontWeight: 700,
                        }}>
                          Assign →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function AdminDashboardPage() {
  const [needs, setNeeds]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [replyText, setReplyText] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [filter, setFilter]       = useState("All");
  const [volunteers, setVolunteers] = useState([]);
  const [resources, setResources] = useState([]);
  const [alertFilter, setAlertFilter] = useState("All");
  const navigate = useNavigate();

  // FIX 3: fetch volunteers from MongoDB
  const fetchVolunteers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/volunteers`);
      setVolunteers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setVolunteers([]);
    }
  }, []);

  const fetchNeeds = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/complaints`);
      setNeeds(Array.isArray(res.data) ? res.data : []);
    } catch { setNeeds([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") !== "true") { navigate("/admin"); return; }
    fetchVolunteers();
    const storedRes = JSON.parse(localStorage.getItem(RESOURCE_KEY) || "null");
    if (Array.isArray(storedRes) && storedRes.length) setResources(storedRes);
    else { localStorage.setItem(RESOURCE_KEY, JSON.stringify(DEFAULT_RESOURCES)); setResources(DEFAULT_RESOURCES); }
    fetchNeeds();
  }, [navigate, fetchNeeds, fetchVolunteers]);

  const handleReply = async (id, close = false) => {
    setSubmitting((p) => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API_BASE_URL}/api/complaints/${id}`, {
        adminReply: replyText[id] || "",
        status: close ? "Completed" : undefined,
      });
      await fetchNeeds();
      setReplyText((p) => ({ ...p, [id]: "" }));
    } catch { alert("Failed to update need."); }
    finally { setSubmitting((p) => ({ ...p, [id]: false })); }
  };

  const handleLogout = () => { sessionStorage.removeItem("isAdmin"); navigate("/admin"); };

  const enrichedNeeds = useMemo(() => needs.map((item) => ({
    ...item,
    displayStatus: displayStatus(item),
    suggestedResources: inferResources(item.category, item.priority),
  })), [needs]);

  const detected    = enrichedNeeds.filter((n) => n.displayStatus === "Detected").length;
  const inProgress  = enrichedNeeds.filter((n) => n.displayStatus === "In Progress").length;
  const completed   = enrichedNeeds.filter((n) => n.displayStatus === "Completed").length;
  const highUrgency = enrichedNeeds.filter((n) => n.priority === "High").length;

  const statusData   = [{ name: "Detected", value: detected }, { name: "In Progress", value: inProgress }, { name: "Completed", value: completed }];
  const categoryMap  = {};
  enrichedNeeds.forEach((n) => { const k = n.category || "General"; categoryMap[k] = (categoryMap[k] || 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  const urgencyData  = [
    { name: "High",   value: highUrgency },
    { name: "Medium", value: enrichedNeeds.filter((n) => n.priority === "Medium").length },
    { name: "Low",    value: enrichedNeeds.filter((n) => n.priority === "Low").length },
  ];

  const urgentAlerts    = useMemo(() => enrichedNeeds.filter((n) => n.priority === "High" && n.displayStatus !== "Completed"), [enrichedNeeds]);
  const alertCategories = useMemo(() => ["All", ...new Set(urgentAlerts.map((a) => a.category))], [urgentAlerts]);
  const filteredAlerts  = alertFilter === "All" ? urgentAlerts : urgentAlerts.filter((a) => a.category === alertFilter);
  const filtered        = filter === "All" ? enrichedNeeds : enrichedNeeds.filter((n) => n.displayStatus === filter);

  const urgencyColor = (u) => u === "High" ? "var(--red)" : u === "Medium" ? "var(--amber)" : "var(--green)";
  const statusColor  = (s) => s === "Completed" ? "var(--green)" : s === "In Progress" ? "var(--cyan)" : "var(--amber)";

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <svg style={{ animation: "spin 1s linear infinite", color: "var(--cyan)" }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Loading coordination dashboard…</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div className="live-dot" />
            <span className="mono-label">Admin · Coordination Console</span>
          </div>
          <h1 className="page-title">Coordination Dashboard</h1>
        </div>
        <button onClick={handleLogout} className="btn-ghost" style={{ alignItems: "center" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          { label: "Total Needs",  value: enrichedNeeds.length, color: "var(--cyan)"  },
          { label: "Detected",     value: detected,             color: "var(--amber)" },
          { label: "In Progress",  value: inProgress,           color: "var(--blue)"  },
          { label: "Completed",    value: completed,            color: "var(--green)" },
          { label: "High Urgency", value: highUrgency,          color: "var(--red)"   },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-accent" style={{ background: s.color }} />
            <div style={{ paddingLeft: 8 }}>
              <span className="stat-label">{s.label}</span>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Status Pie */}
          <div className="syn-card" style={{ padding: 16 }}>
            <div className="mono-label" style={{ marginBottom: 12 }}>Status Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                  {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip contentStyle={CustomTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
              {statusData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[d.name] }} />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.name}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-primary)", fontWeight: 700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency Bar */}
          <div className="syn-card" style={{ padding: 16 }}>
            <div className="mono-label" style={{ marginBottom: 12 }}>Urgency Scores</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={urgencyData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(56,113,193,0.15)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "Space Mono" }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill="#ff4d6a" /><Cell fill="#f59e0b" /><Cell fill="#10d470" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Bar */}
          <div className="syn-card" style={{ padding: 16, gridColumn: "1 / -1" }}>
            <div className="mono-label" style={{ marginBottom: 12 }}>By Category</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={categoryData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(56,113,193,0.15)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "Space Mono" }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts + Resource sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Urgent Alerts */}
          <div className="syn-card" style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", boxShadow: "0 0 8px var(--red)" }} />
                  <span className="mono-label" style={{ marginBottom: 0, color: "var(--red)" }}>Urgent Alerts</span>
                </div>
                {urgentAlerts.length > 0 && (
                  <span style={{ background: "rgba(255,77,106,0.15)", border: "1px solid rgba(255,77,106,0.4)", color: "var(--red)", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                    {urgentAlerts.length} ACTIVE
                  </span>
                )}
              </div>
              {alertCategories.length > 1 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {alertCategories.map((cat) => (
                    <button key={cat} onClick={() => setAlertFilter(cat)} style={{
                      padding: "3px 9px", borderRadius: 20, fontSize: 10, cursor: "pointer",
                      fontFamily: "var(--font-mono)", fontWeight: 600,
                      background: alertFilter === cat ? "rgba(255,77,106,0.15)" : "transparent",
                      border: `1px solid ${alertFilter === cat ? "rgba(255,77,106,0.5)" : "var(--border-subtle)"}`,
                      color: alertFilter === cat ? "var(--red)" : "var(--text-muted)",
                    }}>
                      {cat === "All" ? `All (${urgentAlerts.length})` : `${CATEGORY_ICONS[cat] || ""} ${cat}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, maxHeight: 380 }}>
              {filteredAlerts.length === 0 && (
                <div style={{ padding: "20px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No urgent alerts right now.</p>
                </div>
              )}
              {filteredAlerts.map((item) => {
                const id = String(item._id || item.id);
                return (
                  <UrgentAlertCard
                    key={id} item={item}
                    replyText={replyText[id] || ""}
                    setReplyText={(val) => setReplyText((p) => ({ ...p, [id]: val }))}
                    submitting={!!submitting[id]}
                    onReply={handleReply}
                    onComplete={(alertId) => handleReply(alertId, true)}
                  />
                );
              })}
            </div>
            {urgentAlerts.length > 0 && (
              <div style={{ padding: "8px 14px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {urgentAlerts.filter(a => a.displayStatus === "In Progress").length} in progress · {urgentAlerts.filter(a => a.displayStatus === "Detected").length} awaiting
                </span>
                <button onClick={() => setFilter("Detected")} style={{ fontSize: 10, background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
                  View all →
                </button>
              </div>
            )}
          </div>

          {/* Resource Usage */}
          <div className="syn-card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="mono-label" style={{ marginBottom: 0 }}>Resource Usage</div>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {resources.map((res) => {
                const pct = Math.min(100, (res.usage / Math.max(res.available, 1)) * 100);
                const barColor = pct > 80 ? "var(--red)" : pct > 50 ? "var(--amber)" : "var(--cyan)";
                return (
                  <div key={res.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{res.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: pct > 80 ? "var(--red)" : "var(--text-muted)" }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}99)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Volunteers", value: volunteers.length, color: "var(--green)" },
              { label: "In Action",  value: inProgress,        color: "var(--cyan)"  },
            ].map((m) => (
              <div key={m.label} className="stat-card" style={{ padding: 14 }}>
                <div className="stat-accent" style={{ background: m.color }} />
                <div style={{ paddingLeft: 8 }}>
                  <span className="stat-label">{m.label}</span>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: m.color, marginTop: 4 }}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assign Volunteers Panel (admin-only) ── */}
      <AssignVolunteersPanel
        needs={enrichedNeeds}
        volunteers={volunteers}
        onAssigned={() => { fetchNeeds(); fetchVolunteers(); }}
      />

      {/* Need Management Table */}
      <div className="syn-card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="section-title">Active Needs Management</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All","Detected","In Progress","Completed"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`filter-pill${filter === f ? " active" : ""}`}>{f}</button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 640, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>No needs found.</p>
          )}
          {filtered.map((item) => {
            const id = String(item._id || item.id);
            const shortId = id.slice(-6);
            return (
              <div key={id} style={{ padding: "20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[item.category] || "📋"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--cyan)", fontWeight: 700 }}>#{shortId}</span>
                    <div style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.category}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className="badge" style={{ background: `${urgencyColor(item.priority)}15`, border: `1px solid ${urgencyColor(item.priority)}40`, color: urgencyColor(item.priority) }}>{item.priority}</span>
                    <span className="badge" style={{ background: `${statusColor(item.displayStatus)}15`, border: `1px solid ${statusColor(item.displayStatus)}40`, color: statusColor(item.displayStatus) }}>{item.displayStatus}</span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>{item.text}</p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.location}</span>
                  {item.createdAt && (
                    <><span style={{ color: "var(--border-subtle)" }}>·</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(item.createdAt)}</span></>
                  )}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                  {item.suggestedResources.map((r) => <span key={r} className="syn-tag" style={{ fontSize: 10 }}>{r}</span>)}
                </div>

                {item.adminReply && (
                  <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: "var(--radius-md)", borderLeft: "2px solid var(--cyan)" }}>
                    <div className="mono-label" style={{ color: "var(--cyan)", marginBottom: 6 }}>Coordinator Update</div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.adminReply}</p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <textarea rows={2} value={replyText[id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [id]: e.target.value }))}
                    placeholder="Type an assignment note or coordinator update…"
                    className="syn-input" style={{ minHeight: "unset", fontSize: 12, resize: "none" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleReply(id, false)} disabled={submitting[id] || !replyText[id]?.trim()}
                      className="btn-primary" style={{ fontSize: 12, padding: "8px 16px" }}>
                      {submitting[id] ? "Sending…" : "Send Update"}
                    </button>
                    {item.displayStatus !== "Completed" && (
                      <button onClick={() => handleReply(id, true)} disabled={submitting[id]}
                        className="btn-success" style={{ fontSize: 12, padding: "8px 16px" }}>
                        {submitting[id] ? "Completing…" : "Mark Completed"}
                      </button>
                    )}
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

export default AdminDashboardPage;
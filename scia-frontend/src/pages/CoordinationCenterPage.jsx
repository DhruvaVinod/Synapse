import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5001";

const STATIC_RESOURCES = [
  { id: "r1", name: "Food Kits",        quantity: 120,    unit: "kits",     available: true, used: 38,    location: "Thrissur Warehouse, Kerala",    category: "Food"       },
  { id: "r2", name: "Medicine Boxes",   quantity: 64,     unit: "boxes",    available: true, used: 21,    location: "Chennai Central Store, TN",     category: "Health"     },
  { id: "r3", name: "Relief Vehicles",  quantity: 8,      unit: "vehicles", available: true, used: 5,     location: "Hyderabad Depot, Telangana",    category: "Logistics"  },
  { id: "r4", name: "Relief Funds",     quantity: 250000, unit: "₹",        available: true, used: 92000, location: "SBI Escrow Account",            category: "Finance"    },
  { id: "r5", name: "Hygiene Kits",     quantity: 200,    unit: "kits",     available: true, used: 67,    location: "Kolkata NGO Hub, WB",           category: "Sanitation" },
  { id: "r6", name: "Tents / Shelters", quantity: 45,     unit: "units",    available: true, used: 18,    location: "Jaipur Relief Camp, Rajasthan", category: "Shelter"    },
  { id: "r7", name: "Water Tankers",    quantity: 12,     unit: "tankers",  available: true, used: 7,     location: "Patna District HQ, Bihar",      category: "Water"      },
  { id: "r8", name: "Study Kits",       quantity: 300,    unit: "kits",     available: true, used: 110,   location: "Bhopal Education Dept, MP",     category: "Education"  },
];

const CATEGORY_ICONS = {
  Health: "🏥", Sanitation: "🧹", Water: "💧", Electricity: "⚡",
  Roads: "🛣️", Food: "🍱", Disaster: "🌊", Shelter: "🏠",
  Education: "📚", General: "📋", Logistics: "🚚", Finance: "💰",
};

const RESOURCE_CATEGORY_COLOR = {
  Food: "#f59e0b", Health: "#00d4ff", Logistics: "#8b5cf6",
  Finance: "#10d470", Sanitation: "#06b6d4", Shelter: "#f97316",
  Water: "#3b82f6", Education: "#a78bfa",
};

function urgencyColor(u) {
  if (!u) return "var(--text-muted)";
  const l = u.toLowerCase();
  if (l === "high" || l === "critical") return "var(--red)";
  if (l === "medium") return "var(--amber)";
  return "var(--green)";
}

function getDisplayStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function timeAgo(d) {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Resource Card ─────────────────────────────────────────────────────────────
function ResourceCard({ res }) {
  const pct      = Math.min(100, Math.round((res.used / Math.max(res.quantity, 1)) * 100));
  const barColor = pct > 80 ? "var(--red)" : pct > 55 ? "var(--amber)" : (RESOURCE_CATEGORY_COLOR[res.category] || "var(--cyan)");
  const icon     = CATEGORY_ICONS[res.category] || "📦";

  return (
    <div style={{ padding: "14px 16px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{res.name}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{res.location}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: barColor }}>
            {res.quantity.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>{res.unit}</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{res.used.toLocaleString()} used</div>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--bg-layer3)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {Math.max(0, res.quantity - res.used).toLocaleString()} remaining
        </span>
        <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: barColor, fontWeight: 700 }}>{pct}%</span>
      </div>
    </div>
  );
}

// ── Need Card — view-only, no assign UI ───────────────────────────────────────
function NeedCard({ need, navigate }) {
  const id      = String(need._id || need.id);
  const shortId = id.slice(-6);
  const status  = getDisplayStatus(need);
  const uColor  = urgencyColor(need.priority || need.urgencyScore);
  const icon    = CATEGORY_ICONS[need.category || need.needType] || "📋";
  const vStatus = need.verificationStatus;
  const vColor  =
    vStatus === "Likely Genuine"
      ? "var(--green)"
      : vStatus === "Likely Fake"
        ? "var(--red)"
        : "var(--amber)";

  return (
    <div style={{
      padding: 16,
      background: "var(--bg-layer1)",
      border: `1px solid ${status === "Completed" ? "rgba(16,212,112,0.25)" : need.priority === "High" ? "rgba(255,77,106,0.3)" : "var(--border-subtle)"}`,
      borderLeft: `3px solid ${uColor}`,
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{need.category || need.needType}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>#{shortId}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{need.location} · {timeAgo(need.createdAt)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <span className="badge" style={{ background: `${uColor}15`, border: `1px solid ${uColor}40`, color: uColor, fontSize: 9 }}>
            {(need.priority || need.urgencyScore || "—").toUpperCase()}
          </span>
<<<<<<< HEAD
          <span className="badge" style={{
            fontSize: 9,
            background: status === "Completed" ? "rgba(16,212,112,0.12)" : status === "In Progress" ? "rgba(0,212,255,0.12)" : "rgba(245,158,11,0.12)",
            border: `1px solid ${status === "Completed" ? "rgba(16,212,112,0.3)" : status === "In Progress" ? "rgba(0,212,255,0.3)" : "rgba(245,158,11,0.3)"}`,
            color: status === "Completed" ? "var(--green)" : status === "In Progress" ? "var(--cyan)" : "var(--amber)",
          }}>
            {status.toUpperCase()}
          </span>
          {vStatus && (
            <span className="badge" style={{
              fontSize: 9,
              background: `${vColor}15`,
              border: `1px solid ${vColor}40`,
              color: vColor,
            }}>
              {vStatus.toUpperCase()}
            </span>
          )}
=======
>>>>>>> f54af58058c64afb4d3e48153adc0c93ca2b0185
        </div>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
        {(need.text || "").slice(0, 160)}{(need.text || "").length > 160 ? "…" : ""}
      </p>

      {vStatus && (
        <div style={{
          marginBottom: 10,
          padding: "8px 10px",
          background: "var(--bg-layer2)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: vColor, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
              VERIFY {need.verificationScore ?? 0}/100
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {need.similarComplaintCount || 0} nearby reports
            </span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => navigate(`/track?ref=${shortId}`)}
          style={{ fontSize: 11, padding: "6px 12px", background: "none", border: "1px solid var(--border-subtle)", color: "var(--cyan)", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}
        >
          Track →
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function CoordinationCenterPage() {
  const [needs, setNeeds]         = useState([]);
  const [volunteers, setVolunteers] = useState([]);   // FIX 3: from DB
  const [resources]               = useState(STATIC_RESOURCES);
  const [loading, setLoading]     = useState(true);
  const [needFilter, setNeedFilter] = useState("All");
  const [resFilter, setResFilter] = useState("All");
  const [resSearch, setResSearch] = useState("");
  const navigate = useNavigate();

  // FIX 3: volunteers from MongoDB, not localStorage
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/volunteers`)
      .then((res) => setVolunteers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setVolunteers([]));
  }, []);

  useEffect(() => {
    const fetchNeeds = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/complaints`);
        setNeeds(Array.isArray(res.data) ? res.data : []);
      } catch {
        setNeeds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeNeeds  = useMemo(() => needs.filter((n) => getDisplayStatus(n) !== "Completed"), [needs]);
  const highUrgency  = useMemo(() => needs.filter((n) => n.priority === "High" || n.urgencyScore === "High" || n.urgencyScore === "Critical"), [needs]);

  const NEED_FILTERS = ["All", "High", "Medium", "Low"];
  const filteredNeeds = useMemo(() => {
    if (needFilter === "All") return activeNeeds;
    return activeNeeds.filter((n) => (n.priority || n.urgencyScore) === needFilter);
  }, [activeNeeds, needFilter]);

  const resCategories = useMemo(() => ["All", ...new Set(STATIC_RESOURCES.map((r) => r.category))], []);
  const filteredResources = useMemo(() => {
    let list = resources;
    if (resFilter !== "All") list = list.filter((r) => r.category === resFilter);
    if (resSearch.trim()) list = list.filter((r) =>
      r.name.toLowerCase().includes(resSearch.toLowerCase()) ||
      r.location.toLowerCase().includes(resSearch.toLowerCase())
    );
    return list;
  }, [resources, resFilter, resSearch]);

  const totalResourceUnits = resources.reduce((a, r) => a + r.quantity, 0);
  const usedResourceUnits  = resources.reduce((a, r) => a + r.used, 0);
  const overallPct = Math.round((usedResourceUnits / Math.max(totalResourceUnits, 1)) * 100);

  const stats = [
    { label: "Active Alerts",       value: activeNeeds.length + 1,                          color: "var(--amber)" },
    { label: "High Urgency",        value: highUrgency.length,                          color: "var(--red)"   },
    { label: "Volunteers",          value: volunteers.length,                            color: "var(--cyan)"  },
    { label: "Available Resources", value: resources.filter((r) => r.available).length, color: "var(--green)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="live-dot" />
          <span className="mono-label">Synapse AI Operations Center</span>
        </div>
        <h1 className="page-title">Resource & Coordination Center</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Real-time need queue · Global inventory tracking
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-accent" style={{ background: s.color }} />
            <div style={{ paddingLeft: 8 }}>
              <span className="stat-label">{s.label}</span>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resource Banner */}
      <div style={{ padding: "14px 20px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: 10, display: "flex", alignItems: "center", gap: 20 }}>
        <div>
          <div className="mono-label" style={{ marginBottom: 4 }}>Overall Resource Utilisation</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 800, color: overallPct > 80 ? "var(--red)" : overallPct > 55 ? "var(--amber)" : "var(--cyan)" }}>
            {overallPct}%
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, borderRadius: 4, background: "var(--bg-layer3)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${overallPct}%`, background: overallPct > 80 ? "var(--red)" : "linear-gradient(90deg, var(--cyan), var(--blue))", borderRadius: 4, transition: "width 0.8s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5, fontFamily: "var(--font-mono)" }}>
            {usedResourceUnits.toLocaleString()} of {totalResourceUnits.toLocaleString()} total units deployed across {resources.length} categories
          </div>
        </div>
      </div>

      {/* Two-column: Queue + Inventory */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Active Response Queue — view only */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="section-title">Active Response Queue</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {NEED_FILTERS.map((f) => (
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
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, maxHeight: 680, overflowY: "auto" }}>
            {loading && (
              <div style={{ padding: 24, textAlign: "center" }}>
                <svg style={{ animation: "spin 1s linear infinite", color: "var(--cyan)" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
            )}
            {!loading && filteredNeeds.length === 0 && (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No active needs in this category.</p>
              </div>
            )}
            {filteredNeeds.map((need) => (
              <NeedCard key={String(need._id || need.id)} need={need} navigate={navigate} />
            ))}
          </div>
        </div>

        {/* Global Inventory */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="section-title">Global Inventory</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{resources.length} categories</span>
            </div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" value={resSearch} onChange={(e) => setResSearch(e.target.value)}
                placeholder="Search resources or location…" className="syn-input"
                style={{ paddingLeft: 30, fontSize: 11, padding: "6px 10px 6px 28px" }} />
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {resCategories.map((cat) => (
                <button key={cat} onClick={() => setResFilter(cat)} style={{
                  padding: "3px 9px", borderRadius: 20, fontSize: 10, cursor: "pointer",
                  fontFamily: "var(--font-mono)", fontWeight: 600,
                  background: resFilter === cat ? `${RESOURCE_CATEGORY_COLOR[cat] || "var(--cyan)"}20` : "transparent",
                  border: `1px solid ${resFilter === cat ? (RESOURCE_CATEGORY_COLOR[cat] || "var(--cyan)") + "60" : "var(--border-subtle)"}`,
                  color: resFilter === cat ? (RESOURCE_CATEGORY_COLOR[cat] || "var(--cyan)") : "var(--text-muted)",
                }}>
                  {cat === "All" ? `All (${resources.length})` : `${CATEGORY_ICONS[cat] || ""} ${cat}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, maxHeight: 680, overflowY: "auto" }}>
            {filteredResources.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "12px 0" }}>No resources match your filter.</p>
            )}
            {filteredResources.map((res) => <ResourceCard key={res.id} res={res} />)}
          </div>
        </div>
      </div>

      {/* Volunteer Roster — read-only, live from DB */}
      <div className="syn-card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-title">Volunteer Roster</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{volunteers.length} registered</span>
        </div>
        <div style={{ padding: 14, overflowX: "auto" }}>
          {volunteers.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
              No volunteers registered yet. Add volunteers via the Volunteer Hub.
            </p>
          )}
          {volunteers.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Name", "City", "Skills", "Max Load", "Active Load", "Rating", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {volunteers.map((v, i) => {
                  const isAvailable = (v.current_load || 0) < (v.max_load || 3);
                  return (
                    <tr key={v._id || v.id || i} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-layer1)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "8px 10px", color: "var(--text-primary)", fontWeight: 600 }}>{v.name}</td>
                      <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{v.city}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {(Array.isArray(v.skills) ? v.skills : []).slice(0, 3).map((s) => (
                            <span key={s} className="syn-tag" style={{ fontSize: 9, textTransform: "capitalize" }}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{v.max_load || 3}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>{v.current_load || 0}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", color: "var(--amber)" }}>{(v.rating || 5.0).toFixed(1)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{
                          fontSize: 9, padding: "2px 8px", borderRadius: 20,
                          background: isAvailable ? "rgba(16,212,112,0.12)" : "rgba(245,158,11,0.12)",
                          border: `1px solid ${isAvailable ? "rgba(16,212,112,0.3)" : "rgba(245,158,11,0.3)"}`,
                          color: isAvailable ? "var(--green)" : "var(--amber)",
                          fontFamily: "var(--font-mono)", fontWeight: 700,
                        }}>
                          {isAvailable ? "AVAILABLE" : "DEPLOYED"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default CoordinationCenterPage;
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";
const RESOURCE_KEY = "synapse-resources";

const STATUS_COLORS = { Detected: "#f59e0b", "In Progress": "#00d4ff", Completed: "#10d470" };
const CATEGORY_COLORS = ["#00d4ff","#10d470","#f59e0b","#8b5cf6","#ff4d6a","#7b97c4"];

const DEFAULT_RESOURCES = [
  { id: 1, name: "Food Kits", available: 120, usage: 38 },
  { id: 2, name: "Medicines", available: 64, usage: 21 },
  { id: 3, name: "Vehicles", available: 8, usage: 5 },
  { id: 4, name: "Funds", available: 250000, usage: 92000 },
];

function displayStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function inferResources(category, priority) {
  const base = { Health: ["Medicines","Vehicles"], Sanitation: ["Food Kits"], Water: ["Vehicles"], Electricity: ["Vehicles"], Roads: ["Vehicles"], General: ["Funds","Food Kits"] };
  const items = base[category] || ["Food Kits"];
  return priority === "High" ? [...items, "Rapid Dispatch"] : items;
}

const CustomTooltipStyle = { background: "var(--bg-layer2)", border: "1px solid var(--border-medium)", borderRadius: 8, fontSize: 12, padding: "8px 12px" };

function AdminDashboardPage() {
  const [needs, setNeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [filter, setFilter] = useState("All");
  const [volunteers, setVolunteers] = useState([]);
  const [resources, setResources] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") !== "true") { navigate("/admin"); return; }
    const storedVols = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(storedVols) ? storedVols : []);
    const storedRes = JSON.parse(localStorage.getItem(RESOURCE_KEY) || "null");
    if (Array.isArray(storedRes) && storedRes.length) setResources(storedRes);
    else { localStorage.setItem(RESOURCE_KEY, JSON.stringify(DEFAULT_RESOURCES)); setResources(DEFAULT_RESOURCES); }
    fetchNeeds();
  }, []);

  const fetchNeeds = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/complaints`);
      setNeeds(Array.isArray(res.data) ? res.data : []);
    } catch { setNeeds([]); }
    finally { setLoading(false); }
  };

  const handleReply = async (id, close = false) => {
    setSubmitting((p) => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API_BASE_URL}/api/complaints/${id}`, { adminReply: replyText[id] || "", status: close ? "Resolved" : undefined });
      await fetchNeeds();
      setReplyText((p) => ({ ...p, [id]: "" }));
    } catch { alert("Failed to update need."); }
    finally { setSubmitting((p) => ({ ...p, [id]: false })); }
  };

  const handleLogout = () => { sessionStorage.removeItem("isAdmin"); navigate("/admin"); };

  const enrichedNeeds = useMemo(() => needs.map((item) => ({ ...item, displayStatus: displayStatus(item), suggestedResources: inferResources(item.category, item.priority) })), [needs]);

  const detected = enrichedNeeds.filter((n) => n.displayStatus === "Detected").length;
  const inProgress = enrichedNeeds.filter((n) => n.displayStatus === "In Progress").length;
  const completed = enrichedNeeds.filter((n) => n.displayStatus === "Completed").length;
  const highUrgency = enrichedNeeds.filter((n) => n.priority === "High").length;

  const statusData = [{ name: "Detected", value: detected }, { name: "In Progress", value: inProgress }, { name: "Completed", value: completed }];
  const categoryMap = {};
  enrichedNeeds.forEach((n) => { const k = n.category || "General"; categoryMap[k] = (categoryMap[k] || 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  const urgencyData = [{ name: "High", value: highUrgency }, { name: "Medium", value: enrichedNeeds.filter((n) => n.priority === "Medium").length }, { name: "Low", value: enrichedNeeds.filter((n) => n.priority === "Low").length }];

  const urgentAlerts = useMemo(() => enrichedNeeds.filter((n) => n.priority === "High").slice(0, 5), [enrichedNeeds]);
  const filtered = filter === "All" ? enrichedNeeds : enrichedNeeds.filter((n) => n.displayStatus === filter);

  const urgencyColor = (u) => u === "High" ? "var(--red)" : u === "Medium" ? "var(--amber)" : "var(--green)";
  const statusColor = (s) => s === "Completed" ? "var(--green)" : s === "In Progress" ? "var(--cyan)" : "var(--amber)";

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "60vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <svg style={{ animation: "spin 1s linear infinite", color: "var(--cyan)" }} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          { label: "Total Needs", value: enrichedNeeds.length, color: "var(--cyan)" },
          { label: "Detected", value: detected, color: "var(--amber)" },
          { label: "In Progress", value: inProgress, color: "var(--blue)" },
          { label: "Completed", value: completed, color: "var(--green)" },
          { label: "High Urgency", value: highUrgency, color: "var(--red)" },
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
                <Tooltip contentStyle={CustomTooltipStyle} labelStyle={{ color: "var(--text-primary)" }} />
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

        {/* Alerts + Resources sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="syn-card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="mono-label" style={{ marginBottom: 0 }}>Urgent Alerts</div>
              {urgentAlerts.length > 0 && <span className="badge badge-red">{urgentAlerts.length}</span>}
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
              {urgentAlerts.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", padding: 8 }}>No urgent alerts.</p>}
              {urgentAlerts.map((item) => (
                <div key={String(item._id || item.id)} className="alert-card">
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{item.category}</div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>{item.text?.slice(0, 80)}{item.text?.length > 80 ? "…" : ""}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{item.location}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="syn-card" style={{ padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="mono-label" style={{ marginBottom: 0 }}>Resource Usage</div>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {resources.map((res) => {
                const pct = Math.min(100, (res.usage / Math.max(res.available, 1)) * 100);
                return (
                  <div key={res.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{res.name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--cyan), var(--blue))" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Volunteers", value: volunteers.length, color: "var(--green)" },
              { label: "In Action", value: inProgress, color: "var(--cyan)" },
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

      {/* Need Management */}
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
          {filtered.length === 0 && <p style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>No needs found.</p>}
          {filtered.map((item) => {
            const id = String(item._id || item.id);
            const shortId = id.slice(-6);
            return (
              <div key={id} style={{ padding: "20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  {item.createdAt && <><span style={{ color: "var(--border-subtle)" }}>·</span><span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(item.createdAt).toLocaleString()}</span></>}
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
                  <textarea rows={2} value={replyText[id] || ""} onChange={(e) => setReplyText((p) => ({ ...p, [id]: e.target.value }))} placeholder="Type an assignment note or coordinator update…" className="syn-input" style={{ minHeight: "unset", fontSize: 12, resize: "none" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleReply(id, false)} disabled={submitting[id] || !replyText[id]?.trim()} className="btn-primary" style={{ fontSize: 12, padding: "8px 16px" }}>
                      {submitting[id] ? "Sending…" : "Send Update"}
                    </button>
                    {item.displayStatus !== "Completed" && (
                      <button onClick={() => handleReply(id, true)} disabled={submitting[id]} className="btn-success" style={{ fontSize: 12, padding: "8px 16px" }}>
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
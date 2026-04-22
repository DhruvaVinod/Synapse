import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

const API_BASE_URL = "http://localhost:5000";

const STATUS_COLORS  = { Pending: "#f59e0b", Resolved: "#10b981" };
const CATEGORY_COLORS = ["#378ADD", "#1D9E75", "#D85A30", "#7F77DD", "#D4537E", "#888780"];

function AdminDashboardPage() {
  const [complaints, setComplaints]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [replyText, setReplyText]     = useState({});   // { [id]: string }
  const [submitting, setSubmitting]   = useState({});   // { [id]: bool }
  const [filter, setFilter]           = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("isAdmin") !== "true") {
      navigate("/admin");
      return;
    }
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/complaints`);
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id, close = false) => {
    setSubmitting((p) => ({ ...p, [id]: true }));
    try {
      await axios.patch(`${API_BASE_URL}/api/complaints/${id}`, {
        adminReply: replyText[id] || "",
        status: close ? "Resolved" : undefined,
      });
      await fetchComplaints();
      setReplyText((p) => ({ ...p, [id]: "" }));
    } catch {
      alert("Failed to update complaint.");
    } finally {
      setSubmitting((p) => ({ ...p, [id]: false }));
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdmin");
    navigate("/admin");
  };

  // --- Chart data ---
  const total    = complaints.length;
  const pending  = complaints.filter((c) => c.status === "Pending").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;

  const statusData = [
    { name: "Pending",  value: pending },
    { name: "Resolved", value: resolved },
  ];

  const categoryMap = {};
  complaints.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const priorityMap = { High: 0, Medium: 0, Low: 0 };
  complaints.forEach((c) => { if (priorityMap[c.priority] !== undefined) priorityMap[c.priority]++; });
  const priorityData = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));

  // --- Filtered list ---
  const filtered = filter === "All" ? complaints : complaints.filter((c) => c.status === filter);

  const priorityBadge = (p) => {
    if (p === "High")   return "border-red-500/30 bg-red-500/10 text-red-300";
    if (p === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Manage and respond to all civic complaints</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
        >
          Log out
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total complaints", value: total,    color: "text-white" },
          { label: "Pending",          value: pending,  color: "text-yellow-400" },
          { label: "Resolved",         value: resolved, color: "text-green-400" },
          { label: "Resolution rate",  value: total ? `${Math.round((resolved / total) * 100)}%` : "0%", color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* Status pie */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Status breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category bar */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Complaints by category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority bar */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Complaints by priority</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#e24b4a" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complaint list */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-bold text-white">All complaints</h2>
          <div className="flex gap-2">
            {["All", "Pending", "Resolved"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-700/50">
          {filtered.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No complaints found.</p>
          )}

          {filtered.map((item) => {
            const id = String(item._id || item.id);
            const shortId = id.slice(-6);
            return (
              <div key={id} className="p-6 space-y-4">

                {/* Top row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400">Ref </span>
                    <span className="font-mono text-sm font-bold text-white">#{shortId}</span>
                    <span className="ml-3 text-xs text-slate-400">{item.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      item.status === "Resolved"
                        ? "border-green-500/30 bg-green-500/10 text-green-300"
                        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Complaint text */}
                <p className="text-sm text-slate-300 leading-6">{item.text}</p>

                {/* Location + date */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>{item.location}</span>
                  {item.createdAt && <span>{new Date(item.createdAt).toLocaleString()}</span>}
                </div>

                {/* Existing admin reply */}
                {item.adminReply && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                    <p className="text-xs font-semibold text-blue-300 mb-1">Admin reply</p>
                    <p className="text-sm text-blue-200">{item.adminReply}</p>
                  </div>
                )}

                {/* Reply box — only show for pending or to update reply */}
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={replyText[id] || ""}
                    onChange={(e) => setReplyText((p) => ({ ...p, [id]: e.target.value }))}
                    placeholder="Type a reply to send to the citizen..."
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-[#1f4e79]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReply(id, false)}
                      disabled={submitting[id] || !replyText[id]?.trim()}
                      className="rounded-lg bg-[#1f4e79] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173a5b] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting[id] ? "Sending..." : "Send reply"}
                    </button>
                    {item.status === "Pending" && (
                      <button
                        onClick={() => handleReply(id, true)}
                        disabled={submitting[id]}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting[id] ? "Closing..." : "Reply & mark resolved"}
                      </button>
                    )}
                    {item.status === "Pending" && !replyText[id]?.trim() && (
                      <button
                        onClick={async () => {
                          setSubmitting((p) => ({ ...p, [id]: true }));
                          try {
                            await axios.patch(`${API_BASE_URL}/api/complaints/${id}`, { status: "Resolved" });
                            await fetchComplaints();
                          } finally {
                            setSubmitting((p) => ({ ...p, [id]: false }));
                          }
                        }}
                        disabled={submitting[id]}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Close without reply
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";
const RESOURCE_KEY = "synapse-resources";

const STATUS_COLORS = {
  Detected: "#f59e0b",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
};

const CATEGORY_COLORS = ["#378ADD", "#1D9E75", "#D85A30", "#7F77DD", "#D4537E", "#888780"];

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
  const base = {
    Health: ["Medicines", "Vehicles"],
    Sanitation: ["Food Kits"],
    Water: ["Vehicles"],
    Electricity: ["Vehicles"],
    Roads: ["Vehicles"],
    General: ["Funds", "Food Kits"],
  };
  const items = base[category] || ["Food Kits"];
  return priority === "High" ? [...items, "Rapid Dispatch"] : items;
}

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
    if (sessionStorage.getItem("isAdmin") !== "true") {
      navigate("/admin");
      return;
    }

    const storedVolunteers = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(storedVolunteers) ? storedVolunteers : []);

    const storedResources = JSON.parse(localStorage.getItem(RESOURCE_KEY) || "null");
    if (Array.isArray(storedResources) && storedResources.length) {
      setResources(storedResources);
    } else {
      localStorage.setItem(RESOURCE_KEY, JSON.stringify(DEFAULT_RESOURCES));
      setResources(DEFAULT_RESOURCES);
    }

    fetchNeeds();
  }, []);

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

  const handleReply = async (id, close = false) => {
    setSubmitting((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.patch(`${API_BASE_URL}/api/complaints/${id}`, {
        adminReply: replyText[id] || "",
        status: close ? "Resolved" : undefined,
      });
      await fetchNeeds();
      setReplyText((prev) => ({ ...prev, [id]: "" }));
    } catch {
      alert("Failed to update need.");
    } finally {
      setSubmitting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdmin");
    navigate("/admin");
  };

  const enrichedNeeds = useMemo(
    () => needs.map((item) => ({ ...item, displayStatus: displayStatus(item), suggestedResources: inferResources(item.category, item.priority) })),
    [needs]
  );

  const total = enrichedNeeds.length;
  const detected = enrichedNeeds.filter((item) => item.displayStatus === "Detected").length;
  const inProgress = enrichedNeeds.filter((item) => item.displayStatus === "In Progress").length;
  const completed = enrichedNeeds.filter((item) => item.displayStatus === "Completed").length;
  const highUrgency = enrichedNeeds.filter((item) => item.priority === "High").length;

  const statusData = [
    { name: "Detected", value: detected },
    { name: "In Progress", value: inProgress },
    { name: "Completed", value: completed },
  ];

  const categoryMap = {};
  enrichedNeeds.forEach((item) => {
    const key = item.category || "General";
    categoryMap[key] = (categoryMap[key] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const priorityMap = { High: 0, Medium: 0, Low: 0 };
  enrichedNeeds.forEach((item) => {
    if (priorityMap[item.priority] !== undefined) priorityMap[item.priority] += 1;
  });
  const urgencyData = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));

  const impactMetrics = useMemo(() => {
    const responseTime = detected ? "Needs attention" : "Healthy";
    const peopleHelped = completed * 12;
    const resourceEfficiency = resources.length
      ? `${Math.round(
          (resources.reduce((sum, item) => sum + item.usage, 0) /
            Math.max(resources.reduce((sum, item) => sum + item.available, 0), 1)) * 100
        )}%`
      : "0%";

    return { peopleHelped, responseTime, resourceEfficiency };
  }, [completed, detected, resources]);

  const urgentAlerts = useMemo(() => enrichedNeeds.filter((item) => item.priority === "High").slice(0, 5), [enrichedNeeds]);

  const filtered =
    filter === "All"
      ? enrichedNeeds
      : enrichedNeeds.filter((item) => item.displayStatus === filter);

  const urgencyBadge = (urgency) => {
    if (urgency === "High") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (urgency === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  const statusBadge = (status) => {
    if (status === "Completed") return "border-green-500/30 bg-green-500/10 text-green-300";
    if (status === "In Progress") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-400">Loading coordination dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">NGO / Admin Coordination Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Need allocation, volunteer readiness, resource usage tracking, and urgent alert triage.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700"
        >
          Log out
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {[
          { label: "Total needs", value: total, color: "text-white" },
          { label: "High urgency", value: highUrgency, color: "text-red-400" },
          { label: "Volunteers", value: volunteers.length, color: "text-blue-300" },
          { label: "Completed", value: completed, color: "text-green-400" },
          { label: "People helped", value: impactMetrics.peopleHelped, color: "text-emerald-300" },
          { label: "Resource efficiency", value: impactMetrics.resourceEfficiency, color: "text-cyan-300" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Action status breakdown</h2>
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Needs by type</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={categoryData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Urgency scores</h2>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={urgencyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-slate-200">Operational summary</h2>
            <div className="grid gap-3">
              {[
                ["Task allocation overview", `${inProgress} needs currently being acted upon`],
                ["Volunteer performance", volunteers.length ? `${volunteers.length} volunteer profiles available` : "No volunteer profiles saved yet"],
                ["Resource usage tracking", impactMetrics.resourceEfficiency],
                ["Response state", impactMetrics.responseTime],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Urgent alerts</h2>
            <div className="mt-4 space-y-3">
              {urgentAlerts.length === 0 && <p className="text-sm text-slate-400">No urgent alerts.</p>}
              {urgentAlerts.map((item) => (
                <div key={String(item._id || item.id)} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">{item.category}</p>
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                      High urgency
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300 line-clamp-3">{item.text}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.location}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-200">Resource usage</h2>
            <div className="mt-4 space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="rounded-lg border border-slate-700 bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{resource.name}</p>
                    <p className="text-xs text-slate-400">Available {resource.available}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(100, (resource.usage / Math.max(resource.available, 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Usage tracked: {resource.usage}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-6 py-4">
          <h2 className="text-lg font-bold text-white">All active needs</h2>
          <div className="flex gap-2">
            {["All", "Detected", "In Progress", "Completed"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filter === item
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-700/50">
          {filtered.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">No needs found.</p>}

          {filtered.map((item) => {
            const id = String(item._id || item.id);
            const shortId = id.slice(-6);
            return (
              <div key={id} className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400">Ref </span>
                    <span className="font-mono text-sm font-bold text-white">#{shortId}</span>
                    <span className="ml-3 text-xs text-slate-400">{item.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${urgencyBadge(item.priority)}`}>
                      {item.priority} urgency
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(item.displayStatus)}`}>
                      {item.displayStatus}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-300">{item.text}</p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  <span>{item.location}</span>
                  {item.createdAt && <span>{new Date(item.createdAt).toLocaleString()}</span>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.suggestedResources.map((resource) => (
                    <span key={resource} className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300">
                      {resource}
                    </span>
                  ))}
                </div>

                {item.adminReply && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold text-blue-300">Coordinator update</p>
                    <p className="text-sm text-blue-200">{item.adminReply}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={replyText[id] || ""}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder="Type an assignment note or coordinator update..."
                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-[#1f4e79]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleReply(id, false)}
                      disabled={submitting[id] || !replyText[id]?.trim()}
                      className="rounded-lg bg-[#1f4e79] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173a5b] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting[id] ? "Sending..." : "Send update"}
                    </button>
                    {item.displayStatus !== "Completed" && (
                      <button
                        onClick={() => handleReply(id, true)}
                        disabled={submitting[id]}
                        className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-semibold text-green-300 hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting[id] ? "Completing..." : "Mark completed"}
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

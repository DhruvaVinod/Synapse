import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
} from "react-leaflet";

const API_BASE_URL = "http://localhost:5000";

const CATEGORIES = ["All", "Water", "Electricity", "Roads", "Sanitation", "Health", "General"];

const CATEGORY_COLORS = {
  Water:       { fill: "#378ADD", border: "#185FA5" },
  Electricity: { fill: "#EF9F27", border: "#BA7517" },
  Roads:       { fill: "#888780", border: "#5F5E5A" },
  Sanitation:  { fill: "#1D9E75", border: "#0F6E56" },
  Health:      { fill: "#D4537E", border: "#993556" },
  General:     { fill: "#7F77DD", border: "#534AB7" },
};

const PRIORITY_SIZE = {
  High:   { radius: 14, opacity: 0.85 },
  Medium: { radius: 9,  opacity: 0.65 },
  Low:    { radius: 6,  opacity: 0.45 },
};

const getMarkerStyle = (category, priority) => {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.General;
  const size  = PRIORITY_SIZE[priority]   || PRIORITY_SIZE.Medium;
  return {
    fillColor:   color.fill,
    color:       color.border,
    fillOpacity: size.opacity,
    radius:      size.radius,
    weight:      1.5,
  };
};

function ComplaintsPage() {
  const [complaints, setComplaints]         = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/complaints`);
        setComplaints(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching complaints", err);
      }
    };
    fetchData();
  }, []);

  const validComplaints = useMemo(() =>
    complaints.filter(
      (c) => c.lat && c.lng && !isNaN(Number(c.lat)) && !isNaN(Number(c.lng))
    ), [complaints]);

  const filtered = useMemo(() => {
    return validComplaints.filter((c) => {
      const catOk      = categoryFilter === "All" || c.category === categoryFilter;
      const priorityOk = priorityFilter === "All" || c.priority === priorityFilter;
      return catOk && priorityOk;
    });
  }, [validComplaints, categoryFilter, priorityFilter]);

  const mapCenter = useMemo(() => {
    if (filtered.length > 0) return [Number(filtered[0].lat), Number(filtered[0].lng)];
    return [20.5937, 78.9629];
  }, [filtered]);

  const priorityBadge = (p) => {
    if (p === "High")   return "bg-red-500/20 text-red-400";
    if (p === "Medium") return "bg-yellow-500/20 text-yellow-400";
    return "bg-green-500/20 text-green-400";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">

        <div className="border-b border-slate-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Map & Registered Complaints</h1>
          <p className="mt-1 text-sm text-slate-400">
            Colour = category &nbsp;·&nbsp; Size = priority &nbsp;·&nbsp; Hover for details
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 border-b border-slate-700 px-6 py-4">

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Category</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {cat !== "All" && (
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: CATEGORY_COLORS[cat]?.fill }}
                  />
                )}
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Priority</span>
            {["All", "High", "Medium", "Low"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  priorityFilter === p
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-slate-400 self-center">
            Showing {filtered.length} of {validComplaints.length} complaints
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-6 py-3 border-b border-slate-700">
          {Object.entries(CATEGORY_COLORS).map(([cat, col]) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="h-3 w-3 rounded-full border" style={{ background: col.fill, borderColor: col.border }} />
              {cat}
            </div>
          ))}
          <div className="ml-4 flex items-center gap-3 text-xs text-slate-400">
            <span>Size:</span>
            <span className="flex items-center gap-1"><span className="inline-block h-4 w-4 rounded-full bg-slate-500 opacity-80"/> High</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500 opacity-65"/> Medium</span>
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500 opacity-45"/> Low</span>
          </div>
        </div>

        {/* Map + List */}
        <div className="grid gap-6 p-6 xl:grid-cols-[1.4fr_0.6fr]">

          <div className="overflow-hidden rounded-xl border border-slate-700" style={{ height: 520 }}>
            <MapContainer
              center={mapCenter}
              zoom={5}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {filtered.map((item) => {
                const style = getMarkerStyle(item.category, item.priority);
                const id = String(item._id || item.id);
                return (
                  <CircleMarker
                    key={id}
                    center={[Number(item.lat), Number(item.lng)]}
                    {...style}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <div>
                        <div><span className="font-semibold">{item.category}</span>{" · "}{item.priority} Priority</div>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>Ref #{id.slice(-6)}</div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <div className="font-bold" style={{ color: style.fillColor }}>
                          {item.category}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          {item.priority} Priority · {item.status}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Ref #{id.slice(-6)}</div>
                        <p className="mt-2 text-sm border-t pt-2">{item.text}</p>
                        <div className="mt-1 text-xs text-gray-400">{item.location}</div>
                        <a
                          href={`/track?ref=${id.slice(-6)}`}
                          className="mt-2 block text-xs font-semibold text-blue-500"
                        >
                          Track #{id.slice(-6)}
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Complaint list */}
          <div className="max-h-[520px] overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2">
            <h2 className="sticky top-0 bg-slate-800 pb-2 text-sm font-bold text-white">
              Complaints ({filtered.length})
            </h2>

            {filtered.length === 0 && (
              <p className="text-center text-xs text-slate-400 pt-8">
                No complaints match the current filters.
              </p>
            )}

            {filtered.map((item) => {
              const id = String(item._id || item.id);
              const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.General;
              return (
                <div
                  key={id}
                  className="rounded-lg border border-slate-700 bg-slate-900 p-3 hover:bg-slate-700/50 transition"
                >
                  {/* Category + priority */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ background: color.fill }}
                      />
                      <span className="text-xs font-bold text-slate-200">{item.category}</span>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>

                  {/* Reference ID + status */}
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Ref</span>
                    <span className="font-mono text-[10px] font-bold text-slate-300">#{id.slice(-6)}</span>
                    <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      item.status === "Resolved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Complaint text */}
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{item.text}</p>

                  {/* Location + track link */}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{item.location}</span>
                    <Link
                      to={`/track?ref=${id.slice(-6)}`}
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex-shrink-0 underline underline-offset-2"
                    >
                      Track complaint →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplaintsPage;
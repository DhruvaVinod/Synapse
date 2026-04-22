import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";

const NEED_TYPE_COLORS = {
  Water: { fill: "#378ADD", border: "#185FA5" },
  Electricity: { fill: "#EF9F27", border: "#BA7517" },
  Roads: { fill: "#888780", border: "#5F5E5A" },
  Sanitation: { fill: "#1D9E75", border: "#0F6E56" },
  Health: { fill: "#D4537E", border: "#993556" },
  General: { fill: "#7F77DD", border: "#534AB7" },
};

const URGENCY_SIZE = {
  High: { radius: 16, opacity: 0.9 },
  Medium: { radius: 11, opacity: 0.72 },
  Low: { radius: 8, opacity: 0.5 },
};

function mapStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

function getMarkerStyle(category, priority) {
  const color = NEED_TYPE_COLORS[category] || NEED_TYPE_COLORS.General;
  const size = URGENCY_SIZE[priority] || URGENCY_SIZE.Medium;
  return {
    fillColor: color.fill,
    color: color.border,
    fillOpacity: size.opacity,
    radius: size.radius,
    weight: 1.5,
  };
}

function matchSkills(category) {
  const map = {
    Health: ["Medical"],
    Sanitation: ["Logistics"],
    Water: ["Logistics", "Driving"],
    Electricity: ["Logistics"],
    Roads: ["Rescue", "Driving"],
    General: ["Teaching", "Survey Collection"],
  };
  return map[category] || ["Logistics"];
}

function ComplaintsPage() {
  const [needs, setNeeds] = useState([]);
  const [needTypeFilter, setNeedTypeFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/complaints`);
        setNeeds(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching needs", err);
      }
    };
    fetchData();
    const saved = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(saved) ? saved : []);
  }, []);

  const needTypes = useMemo(() => {
    const dynamic = new Set(["All"]);
    needs.forEach((item) => dynamic.add(item.category || "General"));
    return [...dynamic];
  }, [needs]);

  const validNeeds = useMemo(
    () => needs.filter((item) => item.lat && item.lng && !Number.isNaN(Number(item.lat)) && !Number.isNaN(Number(item.lng))),
    [needs]
  );

  const enrichedNeeds = useMemo(
    () =>
      validNeeds.map((item) => {
        const requiredSkills = matchSkills(item.category);
        const matchedVolunteers = volunteers.filter((volunteer) =>
          volunteer.skills?.some((skill) => requiredSkills.includes(skill))
        );
        return {
          ...item,
          displayStatus: mapStatus(item),
          matchedVolunteers,
          volunteerDensity: matchedVolunteers.length,
        };
      }),
    [validNeeds, volunteers]
  );

  const filtered = useMemo(
    () =>
      enrichedNeeds.filter((item) => {
        const typeOk = needTypeFilter === "All" || item.category === needTypeFilter;
        const urgencyOk = urgencyFilter === "All" || item.priority === urgencyFilter;
        return typeOk && urgencyOk;
      }),
    [enrichedNeeds, needTypeFilter, urgencyFilter]
  );

  const mapCenter = useMemo(() => {
    if (filtered.length > 0) return [Number(filtered[0].lat), Number(filtered[0].lng)];
    return [20.5937, 78.9629];
  }, [filtered]);

  const hotspotSummary = useMemo(() => {
    const counts = {};
    filtered.forEach((item) => {
      const key = item.location || "Unknown Area";
      counts[key] = (counts[key] || 0) + (item.priority === "High" ? 3 : item.priority === "Medium" ? 2 : 1);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [filtered]);

  const urgencyBadge = (urgency) => {
    if (urgency === "High") return "bg-red-500/20 text-red-400";
    if (urgency === "Medium") return "bg-yellow-500/20 text-yellow-400";
    return "bg-green-500/20 text-green-400";
  };

  const statusBadge = (status) => {
    if (status === "Completed") return "bg-green-500/20 text-green-300";
    if (status === "In Progress") return "bg-blue-500/20 text-blue-300";
    return "bg-yellow-500/20 text-yellow-300";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Live Need Heatmap</h1>
          <p className="mt-1 text-sm text-slate-400">
            Colour = need type · Size = urgency score · Density = matched volunteer count
          </p>
        </div>

        <div className="grid gap-4 border-b border-slate-700 px-6 py-4 xl:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Need Type</span>
            {needTypes.map((type) => (
              <button
                key={type}
                onClick={() => setNeedTypeFilter(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  needTypeFilter === type
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Urgency</span>
            {["All", "High", "Medium", "Low"].map((item) => (
              <button
                key={item}
                onClick={() => setUrgencyFilter(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  urgencyFilter === item
                    ? "bg-[#1f4e79] text-white"
                    : "border border-slate-600 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="self-center text-xs text-slate-400">Showing {filtered.length} of {validNeeds.length} needs</div>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-xl border border-slate-700" style={{ height: 560 }}>
            <MapContainer center={mapCenter} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map((item) => {
                const style = getMarkerStyle(item.category, item.priority);
                const id = String(item._id || item.id);
                return (
                  <CircleMarker key={id} center={[Number(item.lat), Number(item.lng)]} {...style}>
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <div>
                        <div><span className="font-semibold">{item.category}</span> · {item.priority} urgency</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          {item.volunteerDensity} matched volunteer{item.volunteerDensity === 1 ? "" : "s"}
                        </div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: 220 }}>
                        <div className="font-bold" style={{ color: style.fillColor }}>{item.category}</div>
                        <div className="mt-1 text-xs text-gray-500 uppercase tracking-wide">
                          {item.priority} urgency · {item.displayStatus}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">Ref #{id.slice(-6)}</div>
                        <p className="mt-2 border-t pt-2 text-sm">{item.text}</p>
                        <div className="mt-1 text-xs text-gray-400">{item.location}</div>
                        <div className="mt-2 text-xs text-gray-500">
                          Matched volunteers: {item.volunteerDensity}
                        </div>
                        <a href={`/track?ref=${id.slice(-6)}`} className="mt-2 block text-xs font-semibold text-blue-500">
                          Track action →
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <h2 className="text-sm font-bold text-white">Clustered Problem Zones</h2>
              <div className="mt-3 space-y-2">
                {hotspotSummary.length === 0 && <p className="text-xs text-slate-400">No hotspot data available.</p>}
                {hotspotSummary.map(([location, score]) => (
                  <div key={location} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-sm font-semibold text-white line-clamp-2">{location}</p>
                    <p className="mt-1 text-xs text-slate-400">Heat score: {score}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <h2 className="text-sm font-bold text-white">Volunteer Density Snapshot</h2>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Density is estimated from volunteer registrations stored in the frontend and matched by need type skills.
              </p>
              <div className="mt-3 grid gap-3">
                {filtered.slice(0, 4).map((item) => (
                  <div key={String(item._id || item.id)} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.category}</p>
                      <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-200">
                        {item.volunteerDensity} nearby-ready
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{item.location}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
        <h2 className="sticky top-0 bg-slate-900 pb-2 text-lg font-bold text-white">Need Board ({filtered.length})</h2>
        {filtered.length === 0 && <p className="pt-6 text-center text-sm text-slate-400">No needs match the current filters.</p>}
        {filtered.map((item) => {
          const id = String(item._id || item.id);
          const color = NEED_TYPE_COLORS[item.category] || NEED_TYPE_COLORS.General;
          return (
            <div key={id} className="rounded-xl border border-slate-700 bg-slate-950 p-4 hover:bg-slate-900 transition">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color.fill }} />
                  <span className="text-sm font-bold text-white">{item.category || "General"}</span>
                </div>
                <div className="flex gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(item.displayStatus)}`}>
                    {item.displayStatus}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>

              <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                <span>Ref #{id.slice(-6)}</span>
                <span className="truncate">{item.location}</span>
                <span>{item.matchedVolunteers.length} matched volunteers</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {matchSkills(item.category).map((skill) => (
                  <span key={skill} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Need-focused reframing of the old complaint card</span>
                <Link to={`/track?ref=${id.slice(-6)}`} className="text-xs font-semibold text-blue-400 underline underline-offset-2 hover:text-blue-300">
                  Track action →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComplaintsPage;

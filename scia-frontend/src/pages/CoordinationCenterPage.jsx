import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";
const VOLUNTEER_KEY = "synapse-volunteers";
const RESOURCE_KEY = "synapse-resources";
//hardcoded shit 
const INITIAL_RESOURCES = [
  { id: 1, name: "Food Kits", available: 120, location: "Central Warehouse", usage: 38 },
  { id: 2, name: "Medicines", available: 64, location: "Clinic Storage", usage: 21 },
  { id: 3, name: "Vehicles", available: 8, location: "Transport Yard", usage: 5 },
  { id: 4, name: "Relief Funds", available: 250000, location: "Emergency Pool", usage: 92000 },
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
    const savedVolunteers = JSON.parse(localStorage.getItem(VOLUNTEER_KEY) || "[]");
    setVolunteers(Array.isArray(savedVolunteers) ? savedVolunteers : []);

    const savedResources = JSON.parse(localStorage.getItem(RESOURCE_KEY) || "null");
    if (Array.isArray(savedResources) && savedResources.length > 0) {
      setResources(savedResources);
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
      } catch {
        setNeeds([]);
      }
    };

    fetchNeeds();
    const id = setInterval(fetchNeeds, 15000);
    return () => clearInterval(id);
  }, []);

  const alerts = useMemo(() => {
    return needs
      .filter((item) => item.priority === "High" || item.status === "Pending")
      .slice(0, 6)
      .map((item) => ({
        id: String(item._id || item.id),
        title: item.category || "Community Need",
        text: item.text,
        location: item.location,
        level: item.priority === "High" ? "Urgent" : "Watch",
      }));
  }, [needs]);

  const resourceSuggestions = useMemo(() => {
    const counter = {};
    needs.forEach((item) => {
      const names = NEED_KEYWORDS[item.category] || ["Food Kits"];
      names.forEach((name) => {
        counter[name] = (counter[name] || 0) + (item.priority === "High" ? 3 : item.priority === "Medium" ? 2 : 1);
      });
    });
    return Object.entries(counter).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [needs]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white">Resource & Alerts Center</h1>
       
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Active alerts", alerts.length],
          ["Tracked resources", resources.length],
          ["Volunteer pool", volunteers.length],
          ["Bulk / survey ready", "UI Ready"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
         

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">Resource Layer</h2>
            <div className="mt-4 space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-white">{resource.name}</p>
                      <p className="text-xs text-slate-400">{resource.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
                      <p className="text-lg font-bold text-white">{resource.available}</p>
                    </div>
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

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-white">Live Alerts Preview</h2>
            <p className="mt-1 text-sm text-slate-400">Refreshes from the existing backend needs feed every 15 seconds.</p>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-400">
                  No urgent alerts right now.
                </div>
              )}
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">{alert.title}</p>
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                      {alert.level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{alert.text}</p>
                  <p className="mt-2 text-xs text-slate-400">{alert.location}</p>
                </div>
              ))}
            </div>
          </div>

          
           
              {resourceSuggestions.map(([name, score]) => (
                <div key={name} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm font-semibold text-white">{name}</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">{score}</p>
                  <p className="mt-1 text-xs text-slate-400">Priority score driven by current needs</p>
                </div>
              ))}
            
          
        </div>
      </div>
    </div>
  );
}

export default CoordinationCenterPage;

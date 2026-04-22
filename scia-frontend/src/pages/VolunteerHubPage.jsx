import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "synapse-volunteers";

const SKILLS = [
  "Medical",
  "Logistics",
  "Teaching",
  "Rescue",
  "Food Distribution",
  "Counselling",
  "Survey Collection",
  "Driving",
];

const AVAILABILITY = ["Weekdays", "Weekends", "Emergency Only", "Full Time", "Evenings"];

function VolunteerHubPage() {
  const [form, setForm] = useState({
    name: "",
    contact: "",
    location: "",
    availability: AVAILABILITY[0],
    skills: [],
  });
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setVolunteers(Array.isArray(saved) ? saved : []);
  }, []);

  const persist = (next) => {
    setVolunteers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((item) => item !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || !form.location.trim() || form.skills.length === 0) {
      return;
    }

    const next = [
      {
        id: Date.now(),
        ...form,
        assignedTasks: Math.floor(Math.random() * 8),
        completedTasks: Math.floor(Math.random() * 5),
        rating: (4 + Math.random()).toFixed(1),
      },
      ...volunteers,
    ];

    persist(next);
    setForm({ name: "", contact: "", location: "", availability: AVAILABILITY[0], skills: [] });
  };

  const stats = useMemo(() => {
    const total = volunteers.length;
    const highlyAvailable = volunteers.filter((v) => ["Full Time", "Weekdays", "Weekends"].includes(v.availability)).length;
    const rescue = volunteers.filter((v) => v.skills.includes("Rescue") || v.skills.includes("Medical")).length;
    const avgRating = total
      ? (volunteers.reduce((sum, item) => sum + Number(item.rating || 0), 0) / total).toFixed(1)
      : "0.0";

    return { total, highlyAvailable, rescue, avgRating };
  }, [volunteers]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold text-white">Volunteer Hub</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
          Frontend-only volunteer module for Synapse. This does not touch your backend.
          Registrations are stored in local browser storage and used across the Synapse UI for matching,
          density, and coordination previews.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Registered volunteers", stats.total],
          ["Ready for deployment", stats.highlyAvailable],
          ["Rescue / medical pool", stats.rescue],
          ["Avg performance", stats.avgRating],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Volunteer Registration</h2>
            <p className="mt-1 text-sm text-slate-400">Capture skills, availability, and location for matching.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Volunteer name"
              className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
            />
            <input
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
              placeholder="Phone or email"
              className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
            />
          </div>

          <input
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Base location / area"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
          />

          <select
            value={form.availability}
            onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
          >
            {AVAILABILITY.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-200">Skills</p>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => {
                const active = form.skills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-blue-500/40 bg-blue-500/20 text-blue-200"
                        : "border-slate-600 bg-slate-950 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-[#1f4e79] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173a5b]"
          >
            Save Volunteer
          </button>
        </form>

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Volunteer Dashboard</h2>
              <p className="mt-1 text-sm text-slate-400">Assigned tasks, readiness, and nearby-need readiness preview.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {volunteers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-400">
                No volunteers registered yet. Add one to activate the volunteer layer in the UI.
              </div>
            )}

            {volunteers.map((volunteer) => (
              <div key={volunteer.id} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{volunteer.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{volunteer.contact} · {volunteer.location}</p>
                  </div>
                  <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {volunteer.availability}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {volunteer.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Assigned tasks</p>
                    <p className="mt-1 text-lg font-bold text-white">{volunteer.assignedTasks}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Completed</p>
                    <p className="mt-1 text-lg font-bold text-white">{volunteer.completedTasks}</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Performance</p>
                    <p className="mt-1 text-lg font-bold text-white">{volunteer.rating}/5</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolunteerHubPage;

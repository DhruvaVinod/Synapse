import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "synapse-volunteers";

const SKILLS = [
  "Medical", "Logistics", "Teaching", "Rescue",
  "Food Distribution", "Counselling", "Survey Collection", "Driving",
];
const AVAILABILITY = ["Weekdays", "Weekends", "Emergency Only", "Full Time", "Evenings"];

const AVAIL_COLOR = {
  "Full Time": "var(--green)",
  "Weekdays": "var(--cyan)",
  "Weekends": "var(--blue)",
  "Emergency Only": "var(--red)",
  "Evenings": "var(--amber)",
};

function VolunteerHubPage() {
  const [form, setForm] = useState({ name: "", contact: "", location: "", availability: AVAILABILITY[0], skills: [] });
  const [volunteers, setVolunteers] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setVolunteers(Array.isArray(saved) ? saved : []);
  }, []);

  const persist = (next) => {
    setVolunteers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleSkill = (skill) =>
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || !form.location.trim() || form.skills.length === 0) return;
    const next = [
      { id: Date.now(), ...form, assignedTasks: Math.floor(Math.random() * 8), completedTasks: Math.floor(Math.random() * 5), rating: (4 + Math.random()).toFixed(1) },
      ...volunteers,
    ];
    persist(next);
    setForm({ name: "", contact: "", location: "", availability: AVAILABILITY[0], skills: [] });
  };

  const stats = useMemo(() => {
    const total = volunteers.length;
    const highlyAvailable = volunteers.filter((v) => ["Full Time", "Weekdays", "Weekends"].includes(v.availability)).length;
    const rescue = volunteers.filter((v) => v.skills.includes("Rescue") || v.skills.includes("Medical")).length;
    const avgRating = total ? (volunteers.reduce((sum, v) => sum + Number(v.rating || 0), 0) / total).toFixed(1) : "0.0";
    return { total, highlyAvailable, rescue, avgRating };
  }, [volunteers]);

  const STAT_ITEMS = [
    { label: "Registered Volunteers", value: stats.total, color: "var(--cyan)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: "Ready for Deployment", value: stats.highlyAvailable, color: "var(--green)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Rescue / Medical Pool", value: stats.rescue, color: "var(--red)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
    { label: "Avg Performance", value: stats.avgRating, color: "var(--amber)", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="live-dot" />
          <span className="mono-label">Volunteer Operations</span>
        </div>
        <h1 className="page-title">Volunteer Hub</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, maxWidth: 560, lineHeight: 1.6 }}>
          Register, match, and track volunteers across active community needs. All data stored locally and surfaced across the Synapse UI.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {STAT_ITEMS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-accent" style={{ background: s.color }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                <span className="stat-label">{s.label}</span>
              </div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>
        {/* Registration Form */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div>
              <div className="section-title" style={{ fontSize: 15 }}>Volunteer Registration</div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Capture skills, availability, and location for matching</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="syn-label">Full Name</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Volunteer name" className="syn-input" />
              </div>
              <div>
                <label className="syn-label">Contact</label>
                <input value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Phone or email" className="syn-input" />
              </div>
            </div>

            <div>
              <label className="syn-label">Base Location</label>
              <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Area, district, or city" className="syn-input" />
            </div>

            <div>
              <label className="syn-label">Availability</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {AVAILABILITY.map((av) => (
                  <button
                    key={av} type="button"
                    onClick={() => setForm((p) => ({ ...p, availability: av }))}
                    className={`filter-pill${form.availability === av ? " active" : ""}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="syn-label">Skills</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {SKILLS.map((skill) => (
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`skill-chip${form.skills.includes(skill) ? " selected" : ""}`}>
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 4, justifyContent: "center" }}
              disabled={!form.name.trim() || !form.contact.trim() || !form.location.trim() || form.skills.length === 0}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Save Volunteer
            </button>
          </form>
        </div>

        {/* Volunteer List */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div className="section-title" style={{ fontSize: 15 }}>Volunteer Dashboard</div>
            <span className="badge badge-cyan">{volunteers.length} registered</span>
          </div>

          <div style={{ padding: "16px", maxHeight: 600, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {volunteers.length === 0 && (
              <div style={{
                padding: 32, textAlign: "center",
                border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No volunteers registered yet.</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Add one to activate the volunteer layer.</p>
              </div>
            )}

            {volunteers.map((vol) => {
              const avColor = AVAIL_COLOR[vol.availability] || "var(--text-secondary)";
              return (
                <div key={vol.id} className="volunteer-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{vol.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{vol.contact} · {vol.location}</div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "3px 10px",
                      borderRadius: 100, fontSize: 10, fontWeight: 700,
                      fontFamily: "var(--font-mono)", border: `1px solid ${avColor}40`,
                      background: `${avColor}10`, color: avColor, whiteSpace: "nowrap",
                    }}>
                      {vol.availability}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {vol.skills.map((skill) => (
                      <span key={skill} className="syn-tag">{skill}</span>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Assigned", value: vol.assignedTasks, color: "var(--cyan)" },
                      { label: "Completed", value: vol.completedTasks, color: "var(--green)" },
                      { label: "Rating", value: `${vol.rating}/5`, color: "var(--amber)" },
                    ].map((m) => (
                      <div key={m.label} style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
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

export default VolunteerHubPage;
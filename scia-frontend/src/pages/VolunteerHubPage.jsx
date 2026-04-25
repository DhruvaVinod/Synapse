import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

// Must match the Mongoose enum exactly (lowercase)
const SKILLS = [
  "medical", "shelter", "education", "elderly support",
  "disaster relief", "food", "hygiene"
];

// Display labels (Title Case) for the UI
const SKILL_LABELS = {
  "medical": "Medical",
  "shelter": "Shelter",
  "education": "Education",
  "elderly support": "Elderly Support",
  "disaster relief": "Disaster Relief",
  "food": "Food",
  "hygiene": "Hygiene",
};

const AVAILABILITY = ["Weekdays", "Weekends", "Emergency Only", "Full Time", "Evenings"];

const AVAIL_COLOR = {
  "Full Time":      "var(--green)",
  "Weekdays":       "var(--cyan)",
  "Weekends":       "var(--blue)",
  "Emergency Only": "var(--red)",
  "Evenings":       "var(--amber)",
};

function VolunteerHubPage() {
  const [form, setForm] = useState({
    name: "", contact: "", location: "", availability: AVAILABILITY[0], skills: [], max_load: 3,
  });
  const [volunteers, setVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Track if we've attempted the fetch (to show empty state vs loading)
  const [fetchDone, setFetchDone] = useState(false);

  // FIX: Always fetch live data from MongoDB — never rely on localStorage for the fleet display
  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/volunteers`);
      setVolunteers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching live volunteers:", err);
      setVolunteers([]);
    } finally {
      setFetchDone(true);
    }
  };

  const toggleSkill = (skill) =>
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim() || !form.location.trim() || form.skills.length === 0) return;

    setIsLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.contact,
        city: form.location,
        max_load: Number(form.max_load),
        // Skills are already stored in lowercase — matches Mongoose enum
        skills: form.skills,
        availability: true,
      };

      const res = await axios.post(`${API_BASE_URL}/api/volunteers`, payload);

      if (res.status === 201 || res.status === 200) {
        // Re-fetch the full list so stats recalculate correctly
        await fetchVolunteers();
        setForm({ name: "", contact: "", location: "", availability: AVAILABILITY[0], skills: [], max_load: 3 });
      }
    } catch (err) {
      console.error("Database Error:", err.response?.data || err.message);
      alert("Registration failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  // FIX: Stats now correctly match lowercase DB skills
  const stats = useMemo(() => {
    const total = volunteers.length;
    const readyToDeploy = volunteers.filter((v) => (v.current_load || 0) < (v.max_load || 3)).length;
    const rescue = volunteers.filter((v) => {
      const safeSkills = (Array.isArray(v.skills) ? v.skills : []).map((s) => s.toLowerCase());
      return safeSkills.includes("medical") || safeSkills.includes("disaster relief");
    }).length;
    const avgRating =
      total
        ? (volunteers.reduce((sum, v) => sum + Number(v.rating || 5.0), 0) / total).toFixed(1)
        : "0.0";
    return { total, readyToDeploy, rescue, avgRating };
  }, [volunteers]);

  const STAT_ITEMS = [
    {
      label: "Registered Volunteers", value: stats.total, color: "var(--cyan)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      label: "Ready for Deployment", value: stats.readyToDeploy, color: "var(--green)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: "Avg Performance", value: stats.avgRating, color: "var(--amber)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
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
          Register, match, and track volunteers across active community needs.
        </p>
      </div>

      {/* Stats Grid */}
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

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 20 }}>

        {/* LEFT: Registration Form */}
        <div className="syn-card" style={{ padding: 0, height: "fit-content" }}>
          <div className="syn-card-header">
            <div>
              <div className="section-title" style={{ fontSize: 15 }}>Volunteer Registration</div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Capture skills, capacity, and base location</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="syn-label">Full Name</label>
                <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Jane Doe" className="syn-input" />
              </div>
              <div>
                <label className="syn-label">Contact Number</label>
                <input required value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} placeholder="+91 XXXXX" className="syn-input" />
              </div>
            </div>

            <div>
              <label className="syn-label">Base Location (City)</label>
              <input required value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Mangaluru" className="syn-input" />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="syn-label">Max Task Capacity</label>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)" }}>{form.max_load} Tasks</span>
              </div>
              <input
                type="range" min="1" max="5"
                value={form.max_load}
                onChange={(e) => setForm((p) => ({ ...p, max_load: e.target.value }))}
                style={{ width: "100%", marginTop: 6, accentColor: "var(--cyan)" }}
              />
            </div>

            <div>
              <label className="syn-label">Availability Type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {AVAILABILITY.map((av) => (
                  <button key={av} type="button" onClick={() => setForm((p) => ({ ...p, availability: av }))} className={`filter-pill${form.availability === av ? " active" : ""}`}>
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="syn-label">Core Skills (AI Routing)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {SKILLS.map((skill) => (
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`skill-chip${form.skills.includes(skill) ? " selected" : ""}`}>
                    {SKILL_LABELS[skill]}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 4, justifyContent: "center" }}
              disabled={!form.name.trim() || !form.contact.trim() || !form.location.trim() || form.skills.length === 0 || isLoading}
            >
              {isLoading ? "Saving to Database…" : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Deploy Responder
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: Active Fleet */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div className="section-title" style={{ fontSize: 15 }}>Active Fleet Database</div>
            <span className="badge badge-cyan">{volunteers.length} Mapped</span>
          </div>

          <div style={{ padding: "16px", maxHeight: "calc(100vh - 280px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {!fetchDone && (
              <div style={{ padding: 32, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading volunteers…</p>
              </div>
            )}

            {fetchDone && volunteers.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No responders in database yet.</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Register a volunteer on the left to sync with MongoDB.</p>
              </div>
            )}

            {volunteers.map((vol) => {
              const isAvailable = (vol.current_load || 0) < (vol.max_load || 3);
              const avColor = isAvailable ? "var(--green)" : "var(--amber)";

              return (
                <div key={vol._id || vol.id} className="volunteer-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                        {vol.name}
                        {isAvailable && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green)" }} />}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase" }}>
                        {[vol.volunteer_id, vol.city, vol.phone].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "3px 10px",
                      borderRadius: 100, fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      fontFamily: "var(--font-mono)", border: `1px solid ${avColor}40`,
                      background: `${avColor}10`, color: avColor, whiteSpace: "nowrap",
                    }}>
                      {isAvailable ? "Ready" : "Deployed"}
                    </span>
                  </div>

                  {/* Skills — displayed in Title Case */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {(Array.isArray(vol.skills) ? vol.skills : []).map((skill) => (
                      <span key={skill} className="syn-tag" style={{ textTransform: "capitalize" }}>{skill}</span>
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
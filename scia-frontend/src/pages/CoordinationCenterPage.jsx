import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client"; // Ensure socket.io-client is installed

const API_BASE_URL = "http://localhost:5000";

function CoordinationCenterPage() {
  const [needs, setNeeds] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedNeedMatches, setSelectedNeedMatches] = useState({ id: null, matches: [] });
  const [isMatching, setIsMatching] = useState(false);

  // 1. Initialize Real-Time Alerts (Socket.io)
  useEffect(() => {
    const socket = io(API_BASE_URL);

    socket.on("connect", () => {
      // Join the admin room to receive high-urgency broadcasts
      socket.emit("join", { role: "admin" });
    });

    socket.on("urgentNeed", (newNeed) => {
      // Instantly add the AI-flagged critical need to the top of the UI
      setNeeds((prev) => [newNeed, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  // 2. Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [needsRes, volsRes, resRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/needs`),
          axios.get(`${API_BASE_URL}/api/volunteers`),
          axios.get(`${API_BASE_URL}/api/resources`)
        ]);
        setNeeds(needsRes.data);
        setVolunteers(volsRes.data);
        setResources(resRes.data);
      } catch (err) {
        console.error("Data fetch failed", err);
      }
    };
    fetchData();
  }, []);

  // 3. Fetch AI-Driven Hybrid Matches for a specific need
  const handleGetAiMatches = async (needId) => {
    setIsMatching(true);
    try {
      // This calls the Node.js controller, which requests matches from Python
      const res = await axios.get(`${API_BASE_URL}/api/coordination/match/${needId}`);
      setSelectedNeedMatches({ id: needId, matches: res.data.matches });
    } catch (err) {
      console.error("AI Matcher error", err);
    } finally {
      setIsMatching(false);
    }
  };

  const stats = useMemo(() => ([
    { label: "Active Alerts", value: needs.filter(n => n.status !== 'Completed').length, color: "var(--red)" },
    { label: "High Urgency", value: needs.filter(n => n.urgencyScore === 'High' || n.urgencyScore === 'Critical').length, color: "var(--amber)" },
    { label: "Volunteers", value: volunteers.length, color: "var(--cyan)" },
    { label: "Available Resources", value: resources.filter(r => r.available).length, color: "var(--green)" }
  ]), [needs, volunteers, resources]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="live-dot" />
          <span className="mono-label">Synapse AI Operations Center</span>
        </div>
        <h1 className="page-title">Resource & Coordination Center</h1>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-accent" style={{ background: s.color }} />
            <span className="stat-label">{s.label}</span>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        
        {/* Active Needs & AI Matcher Hub */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div className="section-title">Active Response Queue</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {needs.slice(0, 5).map((need) => (
              <div key={need.id} className="need-card" style={{ borderLeft: need.urgencyScore === 'Critical' ? '4px solid var(--red)' : '' }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span className="badge badge-cyan">{need.needType}</span>
                  <span className={`badge ${need.urgencyScore === 'Critical' ? 'badge-red' : 'badge-amber'}`}>
                    {need.urgencyScore}
                  </span>
                </div>
                <p style={{ fontSize: 13, marginBottom: 12 }}>{need.text}</p>
                
                <button 
                  onClick={() => handleGetAiMatches(need.id)}
                  className="btn-ghost" 
                  style={{ width: '100%', fontSize: 11 }}
                >
                  {isMatching && selectedNeedMatches.id === need.id ? "Analyzing..." : "Find AI Best-Fit Volunteers"}
                </button>

                {/* Display matches if this need is selected */}
                {selectedNeedMatches.id === need.id && (
                  <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-layer2)', borderRadius: 8 }}>
                    <div className="mono-label" style={{ fontSize: 9 }}>AI Recommended (Sorted by Skill + Distance)</div>
                    {selectedNeedMatches.matches.map(vol => (
                      <div key={vol.volunteer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
                        <span>{vol.name} ({vol.distance_km}km)</span>
                        <span style={{ color: 'var(--cyan)' }}>{vol.hybrid_match_score}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resources & Inventory */}
        <div className="syn-card" style={{ padding: 0 }}>
          <div className="syn-card-header">
            <div className="section-title">Global Inventory</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {resources.map((res) => (
              <div key={res.id} className="resource-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{res.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{res.quantity} {res.unit}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '70%', background: 'var(--cyan)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Location: {res.location}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default CoordinationCenterPage;
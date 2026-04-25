import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const API_BASE_URL = "http://localhost:5001";

function getDisplayStatus(item) {
  if (item.status === "Resolved") return "Completed";if (item.status === "Resolved" || item.status === "Completed") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

const STEPS = ["Detected", "In Progress", "Completed"];
const STEP_IDX = { Detected: 0, "In Progress": 1, Completed: 2 };

function TrackComplaintPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("ref")) handleSearch(searchParams.get("ref"));
  }, []);

  const handleSearch = async (forcedRef) => {
    const ref = (forcedRef || reference).trim();
    if (!ref) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/complaints`);
      const items = Array.isArray(response.data) ? response.data : [];
      const match = items.find(
        (item) => String(item._id) === ref || String(item.id) === ref || String(item._id).endsWith(ref) || String(item._id).slice(-6) === ref
      );
      if (match) { setResult(match); setNotFound(false); }
      else { setResult(null); setNotFound(true); }
    } catch {
      setResult(null); setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const displayStatus = result ? getDisplayStatus(result) : "Detected";
  const stepIdx = STEP_IDX[displayStatus] ?? 0;

  const urgencyColor = (u) => {
    if (u === "High") return "var(--red)";
    if (u === "Medium") return "var(--amber)";
    return "var(--green)";
  };

  return (
    <div style={{ maxWidth: 780 }} className="animate-fade-up">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div className="mono-label">Action Tracking</div>
        </div>
        <h1 className="page-title">Track Action Status</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          Search using the 6-character reference code shown on any need card.
        </p>
      </div>

      {/* Search */}
      <div className="syn-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. 3a4aca"
              className="syn-input"
              style={{ paddingLeft: 40, fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.05em" }}
            />
          </div>
          <button
            onClick={() => handleSearch()}
            className="btn-primary"
            disabled={loading || !reference.trim()}
          >
            {loading ? (
              <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            )}
            Search
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ID + badges */}
          <div className="syn-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div className="mono-label" style={{ marginBottom: 6 }}>Need Reference</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.05em" }}>
                  #{String(result._id || result.id).slice(-6)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="badge" style={{
                  background: `${urgencyColor(result.priority)}15`,
                  border: `1px solid ${urgencyColor(result.priority)}40`,
                  color: urgencyColor(result.priority),
                }}>
                  {result.priority} Urgency
                </span>
                <span className={`badge ${displayStatus === "Completed" ? "badge-green" : displayStatus === "In Progress" ? "badge-blue" : "badge-amber"}`}>
                  {displayStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="syn-card" style={{ padding: 18 }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>Need Type</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>{result.category}</div>
            </div>
            <div className="syn-card" style={{ padding: 18 }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>Location</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{result.location}</div>
              {result.lat && result.lng && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                  {Number(result.lat).toFixed(5)}, {Number(result.lng).toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="syn-card" style={{ padding: 18 }}>
            <div className="mono-label" style={{ marginBottom: 8 }}>Need Description</div>
            <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>{result.text}</p>
          </div>

          {/* Reported at */}
          {result.createdAt && (
            <div className="syn-card" style={{ padding: 18 }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>Reported On</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{new Date(result.createdAt).toLocaleString()}</div>
            </div>
          )}

          {/* Action Flow */}
          <div className="syn-card" style={{ padding: 20 }}>
            <div className="mono-label" style={{ marginBottom: 16 }}>Action Flow</div>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {STEPS.map((step, i) => (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "unset" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                      border: `1px solid ${i <= stepIdx ? (i === stepIdx ? "var(--cyan)" : "var(--green)") : "var(--border-subtle)"}`,
                      background: i < stepIdx ? "rgba(16,212,112,0.12)" : i === stepIdx ? "rgba(0,212,255,0.1)" : "var(--bg-layer1)",
                      color: i < stepIdx ? "var(--green)" : i === stepIdx ? "var(--cyan)" : "var(--text-muted)",
                      boxShadow: i === stepIdx ? "0 0 12px rgba(0,212,255,0.3)" : "none",
                      transition: "all 0.3s",
                    }}>
                      {i < stepIdx ? "✓" : i + 1}
                    </div>
                    <div style={{
                      fontSize: 10, marginTop: 6, fontFamily: "var(--font-mono)",
                      color: i <= stepIdx ? "var(--text-primary)" : "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}>
                      {step}
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      flex: 1, height: 1, margin: "0 8px", marginBottom: 20,
                      background: i < stepIdx ? "var(--green)" : "var(--border-subtle)",
                      boxShadow: i < stepIdx ? "0 0 4px rgba(16,212,112,0.4)" : "none",
                      transition: "all 0.3s",
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Coordinator update */}
          {result.adminReply ? (
            <div style={{
              padding: "16px 18px",
              background: "rgba(59,130,246,0.06)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--blue)",
            }}>
              <div className="mono-label" style={{ color: "var(--blue)", marginBottom: 8 }}>Coordinator Update</div>
              <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>{result.adminReply}</p>
              {result.closedAt && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10, fontFamily: "var(--font-mono)" }}>
                  Completed on {new Date(result.closedAt).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div style={{ padding: 18, textAlign: "center", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No coordinator update yet. Awaiting action flow progression.</p>
            </div>
          )}
        </div>
      )}

      {notFound && (
        <div style={{
          padding: "14px 18px",
          background: "var(--red-dim)", border: "1px solid rgba(255,77,106,0.3)",
          borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: "#ff7a8a",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          No record found for that reference. Make sure you're entering the 6-character code.
        </div>
      )}
    </div>
  );
}

export default TrackComplaintPage;
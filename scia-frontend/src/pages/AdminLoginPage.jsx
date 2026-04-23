import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, { password });
      if (res.data.success) {
        sessionStorage.setItem("isAdmin", "true");
        navigate("/admin/dashboard");
      }
    } catch {
      setError("Incorrect password. Access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="animate-fade-up">
        {/* Header above card */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            margin: "0 auto 16px",
            background: "linear-gradient(135deg, #0f4c81, rgba(0,212,255,0.15))",
            border: "1px solid rgba(0,212,255,0.35)",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(0,212,255,0.2)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="heading-display" style={{ fontSize: 24, marginBottom: 6 }}>Admin Access</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Synapse coordination console</p>
        </div>

        <div className="syn-card">
          <form onSubmit={handleLogin} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="syn-label">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="syn-input"
                autoFocus
              />
            </div>

            {error && (
              <div style={{
                padding: "11px 14px",
                background: "var(--red-dim)",
                border: "1px solid rgba(255,77,106,0.3)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                color: "#ff7a8a",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "13px 24px", marginTop: 4 }}
            >
              {isLoading ? (
                <>
                  <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Verifying…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Enter Coordination Dashboard
                </>
              )}
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              RESTRICTED ACCESS · AUTHORIZED PERSONNEL ONLY
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
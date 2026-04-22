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
    } catch (err) {
      setError("Incorrect password. Access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
          <div className="border-b border-slate-700 px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-600 bg-slate-800">
              <svg width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Admin Access</h1>
            <p className="mt-1 text-sm text-slate-400">UrbanMind control panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 p-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password}
              className="w-full rounded-lg bg-[#1f4e79] py-3 text-sm font-semibold text-white transition hover:bg-[#173a5b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Verifying..." : "Enter Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
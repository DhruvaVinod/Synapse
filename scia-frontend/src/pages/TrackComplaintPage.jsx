import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const API_BASE_URL = "http://localhost:5000";

function TrackComplaintPage() {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("ref") || "");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (searchParams.get("ref")) {
      handleSearch(searchParams.get("ref"));
    }
  }, []);

  const handleSearch = async (forcedRef) => {
    const ref = (forcedRef || reference).trim();
    if (!ref) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/complaints`);
      const complaints = Array.isArray(response.data) ? response.data : [];

      // Match against full _id or the last 6 chars shown in the UI
      const match = complaints.find(
        (item) =>
          String(item._id) === ref ||
          String(item.id) === ref ||
          String(item._id).endsWith(ref) ||
          String(item._id).slice(-6) === ref
      );

      if (match) {
        setResult(match);
        setNotFound(false);
      } else {
        setResult(null);
        setNotFound(true);
      }
    } catch (err) {
      setResult(null);
      setNotFound(true);
    }
  };

  const priorityClasses = (priority) => {
    if (priority === "High") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (priority === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Track Complaint</h1>
          <p className="mt-1 text-sm text-slate-300">
            Enter the 6-character reference number shown on your complaint card.
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. 3a4aca"
              className="flex-1 rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
            />
            <button
              onClick={() => handleSearch()}
              className="rounded-lg bg-[#1f4e79] px-5 py-3 font-semibold text-white hover:bg-[#173a5b]"
            >
              Search
            </button>
          </div>

          {result && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reference</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    #{String(result._id || result.id).slice(-6)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClasses(result.priority)}`}>
                    {result.priority} Priority
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    result.status === "Resolved"
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  }`}>
                    {result.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Category</p>
                  <p className="text-white font-medium">{result.category}</p>
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Location</p>
                  <p className="text-white">{result.location}</p>
                  {result.lat && result.lng && (
                    <p className="text-xs text-slate-400 mt-1">
                      {Number(result.lat).toFixed(5)}, {Number(result.lng).toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Complaint</p>
                  <p className="text-white leading-6">{result.text}</p>
                </div>

                {result.createdAt && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Submitted On</p>
                    <p className="text-white">{new Date(result.createdAt).toLocaleString()}</p>
                  </div>
                )}

                {result.adminReply ? (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-300 mb-2">
                      Official response from UrbanMind
                    </p>
                    <p className="text-sm text-blue-100 leading-6">{result.adminReply}</p>
                    {result.closedAt && (
                      <p className="mt-2 text-xs text-blue-300/60">
                        Resolved on {new Date(result.closedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      No official response yet. Check back soon.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {notFound && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
              No complaint found for that reference number. Make sure you are entering the 6-character code shown on the complaint card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackComplaintPage;
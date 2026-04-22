import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const API_BASE_URL = "http://localhost:5000";

function getDisplayStatus(item) {
  if (item.status === "Resolved") return "Completed";
  if (item.adminReply) return "In Progress";
  return "Detected";
}

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
      const items = Array.isArray(response.data) ? response.data : [];

      const match = items.find(
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
    } catch {
      setResult(null);
      setNotFound(true);
    }
  };

  const urgencyClasses = (urgency) => {
    if (urgency === "High") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (urgency === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  const displayStatus = result ? getDisplayStatus(result) : "Detected";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Track Action Status</h1>
          <p className="mt-1 text-sm text-slate-300">
            Search the current backend record using the 6-character reference code.
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
            <button onClick={() => handleSearch()} className="rounded-lg bg-[#1f4e79] px-5 py-3 font-semibold text-white hover:bg-[#173a5b]">
              Search
            </button>
          </div>

          {result && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Need Reference</p>
                    <p className="mt-1 text-xl font-bold text-white">#{String(result._id || result.id).slice(-6)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClasses(result.priority)}`}>
                      {result.priority} Urgency
                    </span>
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                      {displayStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Need Type</p>
                  <p className="mt-2 text-lg font-bold text-white">{result.category}</p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</p>
                  <p className="mt-2 text-sm text-white">{result.location}</p>
                  {result.lat && result.lng && (
                    <p className="mt-1 text-xs text-slate-400">
                      {Number(result.lat).toFixed(5)}, {Number(result.lng).toFixed(5)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Need Description</p>
                <p className="mt-2 text-sm leading-7 text-white">{result.text}</p>
              </div>

              {result.createdAt && (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reported On</p>
                  <p className="mt-2 text-sm text-white">{new Date(result.createdAt).toLocaleString()}</p>
                </div>
              )}

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Action Flow</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    "Detected",
                    "Assigned",
                    "In Progress",
                    "Completed",
                  ].map((step) => {
                    const active =
                      step === "Detected" ||
                      (step === "Assigned" && ["In Progress", "Completed"].includes(displayStatus)) ||
                      (step === "In Progress" && ["In Progress", "Completed"].includes(displayStatus)) ||
                      (step === "Completed" && displayStatus === "Completed");
                    return (
                      <span
                        key={step}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          active
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {step}
                      </span>
                    );
                  })}
                </div>
              </div>

              {result.adminReply ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-300">Coordinator Update</p>
                  <p className="text-sm leading-6 text-blue-100">{result.adminReply}</p>
                  {result.closedAt && (
                    <p className="mt-2 text-xs text-blue-300/70">
                      Completed on {new Date(result.closedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-600 bg-slate-800/50 p-4 text-center">
                  <p className="text-xs text-slate-400">No coordinator update yet. The need is still awaiting action flow progression.</p>
                </div>
              )}
            </div>
          )}

          {notFound && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              No record found for that reference number. Make sure you are entering the 6-character code shown on the need card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackComplaintPage;

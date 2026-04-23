import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

const LANGUAGES = [
  { label: "English", speechCode: "en-IN", isoCode: "en" },
  { label: "हिन्दी", speechCode: "hi-IN", isoCode: "hi" },
  { label: "தமிழ்", speechCode: "ta-IN", isoCode: "ta" },
  { label: "తెలుగు", speechCode: "te-IN", isoCode: "te" },
  { label: "ಕನ್ನಡ", speechCode: "kn-IN", isoCode: "kn" },
  { label: "മലയാളം", speechCode: "ml-IN", isoCode: "ml" },
  { label: "मराठी", speechCode: "mr-IN", isoCode: "mr" },
  { label: "বাংলা", speechCode: "bn-IN", isoCode: "bn" },
  { label: "ਪੰਜਾਬੀ", speechCode: "pa-IN", isoCode: "pa" },
  { label: "ગુજરાતી", speechCode: "gu-IN", isoCode: "gu" },
  { label: "اردو", speechCode: "ur-PK", isoCode: "ur" },
];

const INPUT_SOURCES = ["Citizen Report", "NGO Field Report", "Survey Upload", "Bulk Ingestion"];

const NEED_TYPE_HINTS = {
  Food: ["food", "meal", "ration", "hunger", "kit"],
  Health: ["medical", "medicine", "health", "doctor", "clinic", "injury"],
  Disaster: ["flood", "rain", "storm", "landslide", "earthquake", "relief"],
  Education: ["school", "teacher", "study", "notebook", "children", "class"],
  Shelter: ["shelter", "housing", "roof", "camp", "displaced"],
  Sanitation: ["garbage", "sanitation", "toilet", "waste", "drain", "hygiene"],
};

function detectNeedType(text = "") {
  const lower = text.toLowerCase();
  for (const [type, words] of Object.entries(NEED_TYPE_HINTS)) {
    if (words.some((w) => lower.includes(w))) return type;
  }
  return "General Support";
}

function scoreUrgency(text = "") {
  const lower = text.toLowerCase();
  if (/(urgent|critical|immediate|stranded|flood|injury|emergency|no food|no water)/.test(lower)) return "High";
  if (/(soon|shortage|support needed|lack|delay)/.test(lower)) return "Medium";
  return "Low";
}

function predictResources(type, urgency) {
  const base = {
    Food: ["Food Kits", "Volunteers", "Vehicle Support"],
    Health: ["Medicines", "Medical Volunteers", "Transport"],
    Disaster: ["Rescue Team", "Vehicles", "Relief Funds"],
    Education: ["Teaching Volunteers", "Study Kits", "Survey Support"],
    Shelter: ["Shelter Materials", "Vehicles", "Funds"],
    Sanitation: ["Hygiene Kits", "Logistics Team", "Cleanup Support"],
    "General Support": ["Volunteer Team", "Relief Funds", "Coordinator Review"],
  };
  const items = base[type] || base["General Support"];
  return urgency === "High" ? [...items, "Priority Dispatch"] : items;
}

const URGENCY_CONFIG = {
  High: { color: "var(--red)", bg: "rgba(255,77,106,0.1)", border: "rgba(255,77,106,0.3)" },
  Medium: { color: "var(--amber)", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  Low: { color: "var(--green)", bg: "rgba(16,212,112,0.1)", border: "rgba(16,212,112,0.3)" },
};

function RegisterComplaintPage() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [source, setSource] = useState(INPUT_SOURCES[0]);
  const [impactCount, setImpactCount] = useState("");
  const [form, setForm] = useState({ complaintText: "", locationName: "" });
  const [locationInput, setLocationInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [error, setError] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  const predictedNeedType = useMemo(() => detectNeedType(form.complaintText), [form.complaintText]);
  const predictedUrgency = useMemo(() => scoreUrgency(form.complaintText), [form.complaintText]);
  const predictedResources = useMemo(() => predictResources(predictedNeedType, predictedUrgency), [predictedNeedType, predictedUrgency]);
  const urgConfig = URGENCY_CONFIG[predictedUrgency];

  useEffect(() => { setupSpeechRecognition(selectedLang.speechCode); setVoiceStatus(`Click start to record in ${selectedLang.label}`); }, [selectedLang]);

  useEffect(() => {
    const handleClickOutside = (e) => { if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) setSuggestions([]); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setupSpeechRecognition = (langCode) => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); setVoiceStatus("Voice input not supported in this browser"); return; }
    const recognition = new SR();
    recognition.lang = langCode; recognition.continuous = false; recognition.interimResults = true;
    recognition.onstart = () => { setIsListening(true); setVoiceStatus("Recording… speak now"); };
    recognition.onresult = (event) => {
      let final = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (final) setForm((p) => ({ ...p, complaintText: `${p.complaintText} ${final}`.trim() }));
      if (interim) setVoiceStatus(`Hearing: "${interim}"`);
    };
    recognition.onerror = (e) => { setIsListening(false); setVoiceStatus(`Error: ${e.error}`); };
    recognition.onend = () => { setIsListening(false); setVoiceStatus("Recording stopped"); };
    recognitionRef.current = recognition;
    setVoiceSupported(true);
  };

  const handleLocationInput = (e) => {
    const val = e.target.value;
    setLocationInput(val);
    setSelectedLocation(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`);
        setSuggestions(res.data);
      } catch {} finally { setIsFetchingSuggestions(false); }
    }, 400);
  };

  const handleSelectSuggestion = (item) => {
    const label = item.display_name;
    setLocationInput(label);
    setSelectedLocation({ label, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setForm((p) => ({ ...p, locationName: label }));
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.complaintText.trim()) { setError("Please describe the community need."); return; }
    if (!selectedLocation) { setError("Please select a location from the dropdown."); return; }
    setError(""); setIsSubmitting(true);
    try {
      const payload = {
        text: form.complaintText, location: selectedLocation.label,
        lat: selectedLocation.lat, lng: selectedLocation.lng,
        category: predictedNeedType, priority: predictedUrgency,
        source, impactCount, language: selectedLang.isoCode,
      };
      const res = await axios.post(`${API_BASE_URL}/api/complaints`, payload);
      setSubmitResult({ ...res.data, id: String(res.data._id || res.data.id).slice(-6), priority: predictedUrgency, predictedNeedType, predictedResources, displayText: form.complaintText, source, impactCount });
      setForm({ complaintText: "", locationName: "" }); setLocationInput(""); setSelectedLocation(null); setImpactCount("");
    } catch { setError("Failed to submit. Please try again."); }
    finally { setIsSubmitting(false); }
  };

  const clearForm = () => { setForm({ complaintText: "", locationName: "" }); setLocationInput(""); setSelectedLocation(null); setImpactCount(""); setError(""); setSubmitResult(null); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="mono-label">Need Registration</span>
        </div>
        <h1 className="page-title">Report Community Need</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>
          Multilingual intake with automatic urgency scoring and resource prediction.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20, alignItems: "start" }}>
        {/* Left: form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="syn-card" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: 15, marginBottom: 16 }}>Input Configuration</div>

            {/* Language + Source */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label className="syn-label">Language</label>
                <select value={selectedLang.speechCode} onChange={(e) => setSelectedLang(LANGUAGES.find((l) => l.speechCode === e.target.value))} className="syn-input">
                  {LANGUAGES.map((l) => <option key={l.speechCode} value={l.speechCode}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="syn-label">Input Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="syn-input">
                  {INPUT_SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Voice */}
            {voiceSupported && (
              <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Voice Input</div>
                  <div style={{ fontSize: 12, color: isListening ? "var(--red)" : "var(--text-secondary)" }}>
                    {isListening && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><div className="live-dot" style={{ background: "var(--red)" }} /></span>}
                    {voiceStatus}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { if (isListening) recognitionRef.current?.stop(); else recognitionRef.current?.start(); }}
                  style={{
                    padding: "7px 14px", borderRadius: "var(--radius-md)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: isListening ? "rgba(255,77,106,0.12)" : "rgba(0,212,255,0.1)",
                    border: `1px solid ${isListening ? "rgba(255,77,106,0.3)" : "rgba(0,212,255,0.3)"}`,
                    color: isListening ? "var(--red)" : "var(--cyan)",
                  }}
                >
                  {isListening ? "Stop" : "Start Recording"}
                </button>
              </div>
            )}

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label className="syn-label">Need Description</label>
              <textarea
                value={form.complaintText}
                onChange={(e) => setForm((p) => ({ ...p, complaintText: e.target.value }))}
                placeholder="Describe the community need clearly. Include context about the issue, affected people, and urgency..."
                className="syn-input"
                style={{ minHeight: 120, dir: selectedLang.isoCode === "ur" ? "rtl" : "ltr" }}
              />
            </div>

            {/* Location */}
            <div style={{ marginBottom: 14, position: "relative" }} ref={suggestionsRef}>
              <label className="syn-label">Location</label>
              <input
                type="text" value={locationInput} onChange={handleLocationInput}
                placeholder="Start typing area, street, landmark, or village…"
                className="syn-input"
              />
              {isFetchingSuggestions && <p style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>Searching…</p>}
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", zIndex: 50, top: "100%", left: 0, right: 0, background: "var(--bg-layer2)", border: "1px solid var(--border-medium)", borderRadius: "var(--radius-md)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", marginTop: 4, overflow: "hidden" }}>
                  {suggestions.map((item) => (
                    <button key={item.place_id} type="button" onClick={() => handleSelectSuggestion(item)}
                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "var(--text-primary)", background: "transparent", border: "none", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-layer3)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
              {selectedLocation && (
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
                    Pinned — {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                  </span>
                </div>
              )}
            </div>

            {/* Impact Count */}
            <div style={{ marginBottom: 14 }}>
              <label className="syn-label">People Impacted (optional)</label>
              <input type="number" value={impactCount} onChange={(e) => setImpactCount(e.target.value)} placeholder="Estimated number" className="syn-input" />
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: "10px 14px", background: "var(--red-dim)", border: "1px solid rgba(255,77,106,0.3)", borderRadius: "var(--radius-md)", fontSize: 13, color: "#ff7a8a", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={isSubmitting || isTranslating} className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                {isSubmitting ? (
                  <><svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Submitting…</>
                ) : "Submit Community Need"}
              </button>
              <button type="button" onClick={clearForm} className="btn-ghost">Reset</button>
            </div>
          </div>
        </div>

        {/* Right: AI Preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="syn-card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="section-title" style={{ fontSize: 14 }}>Intelligence Preview</div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Updates as you type · Rule + ML hybrid</p>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div className="mono-label" style={{ marginBottom: 8 }}>Need Detection</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>{predictedNeedType}</div>
              </div>

              <div style={{ padding: "12px 14px", background: urgConfig.bg, border: `1px solid ${urgConfig.border}`, borderRadius: "var(--radius-md)" }}>
                <div className="mono-label" style={{ marginBottom: 8 }}>Urgency Score</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: urgConfig.color }}>{predictedUrgency}</div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                    {["Low","Medium","High"].map((level, i) => (
                      <div key={level} style={{ height: 3, borderRadius: 2, background: i <= ["Low","Medium","High"].indexOf(predictedUrgency) ? urgConfig.color : "var(--bg-layer3)" }} />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div className="mono-label" style={{ marginBottom: 8 }}>Predicted Resources</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {predictedResources.map((r) => <span key={r} className="syn-tag" style={{ fontSize: 10 }}>{r}</span>)}
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                <div className="mono-label" style={{ marginBottom: 8 }}>Action Flow</div>
                <div style={{ display: "flex", gap: 5 }}>
                  {["Detected","Assigned","In Progress","Completed"].map((s, i) => (
                    <span key={s} style={{ flex: 1, textAlign: "center", padding: "4px 0", borderRadius: 4, fontSize: 9, fontFamily: "var(--font-mono)", background: i === 0 ? "rgba(0,212,255,0.15)" : "var(--bg-layer3)", border: `1px solid ${i === 0 ? "rgba(0,212,255,0.35)" : "var(--border-subtle)"}`, color: i === 0 ? "var(--cyan)" : "var(--text-muted)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Submit result */}
      {submitResult && (
        <div className="syn-card animate-fade-up" style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 8px var(--green)" }} />
              <div className="section-title" style={{ fontSize: 15 }}>Need Registered</div>
            </div>
            <span className="badge badge-green">Intake Successful</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: "var(--cyan)" }}>#{submitResult.id}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="badge" style={{ background: URGENCY_CONFIG[submitResult.priority]?.bg, border: `1px solid ${URGENCY_CONFIG[submitResult.priority]?.border}`, color: URGENCY_CONFIG[submitResult.priority]?.color }}>
                  {submitResult.priority} Urgency
                </span>
                <span className="badge badge-cyan">Detected</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                ["Need Type", submitResult.predictedNeedType],
                ["Source", submitResult.source],
                ["Impacted", submitResult.impactCount || "—"],
                ["Status", "Queued for action"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <div className="mono-label" style={{ marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", marginBottom: 12 }}>
              <div className="mono-label" style={{ marginBottom: 6 }}>Description</div>
              <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7 }}>{submitResult.displayText}</p>
            </div>
            <div style={{ padding: "12px 14px", background: "var(--bg-layer1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>Suggested Resources</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {submitResult.predictedResources.map((r) => <span key={r} className="syn-tag">{r}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterComplaintPage;
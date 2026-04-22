import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

const LANGUAGES = [
  { label: "English", speechCode: "en-IN", isoCode: "en", flag: "🇬🇧" },
  { label: "हिन्दी", speechCode: "hi-IN", isoCode: "hi", flag: "🇮🇳" },
  { label: "தமிழ்", speechCode: "ta-IN", isoCode: "ta", flag: "🇮🇳" },
  { label: "తెలుగు", speechCode: "te-IN", isoCode: "te", flag: "🇮🇳" },
  { label: "ಕನ್ನಡ", speechCode: "kn-IN", isoCode: "kn", flag: "🇮🇳" },
  { label: "മലയാളം", speechCode: "ml-IN", isoCode: "ml", flag: "🇮🇳" },
  { label: "मराठी", speechCode: "mr-IN", isoCode: "mr", flag: "🇮🇳" },
  { label: "বাংলা", speechCode: "bn-IN", isoCode: "bn", flag: "🇮🇳" },
  { label: "ਪੰਜਾਬੀ", speechCode: "pa-IN", isoCode: "pa", flag: "🇮🇳" },
  { label: "ગુજરાતી", speechCode: "gu-IN", isoCode: "gu", flag: "🇮🇳" },
  { label: "اردو", speechCode: "ur-PK", isoCode: "ur", flag: "🇵🇰" },
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
    if (words.some((word) => lower.includes(word))) {
      return type;
    }
  }
  return "General Support";
}

function scoreUrgency(text = "") {
  const lower = text.toLowerCase();
  if (/(urgent|critical|immediate|stranded|flood|injury|emergency|no food|no water)/.test(lower)) {
    return "High";
  }
  if (/(soon|shortage|support needed|lack|delay)/.test(lower)) {
    return "Medium";
  }
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
  if (urgency === "High") {
    return [...items, "Priority Dispatch"];
  }
  return items;
}

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

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
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
  const predictedResources = useMemo(
    () => predictResources(predictedNeedType, predictedUrgency),
    [predictedNeedType, predictedUrgency]
  );

  useEffect(() => {
    setupSpeechRecognition(selectedLang.speechCode);
    setVoiceStatus(`Click start to record in ${selectedLang.label}`);
  }, [selectedLang]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setupSpeechRecognition = (langCode) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setVoiceStatus("Voice input is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Recording… speak now");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }

      if (finalTranscript) {
        setForm((prev) => ({
          ...prev,
          complaintText: `${prev.complaintText} ${finalTranscript}`.trim(),
        }));
      }

      if (interimTranscript) {
        setVoiceStatus(`Hearing: "${interimTranscript}"`);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceStatus(`Voice error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus("Recording stopped");
    };

    recognitionRef.current = recognition;
    setVoiceSupported(true);
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.start();
    } catch {
      setVoiceStatus("Microphone permission denied or unavailable");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const fetchSuggestions = (query) => {
    clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsFetchingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: query, format: "json", limit: 5, addressdetails: 1 },
          headers: { "User-Agent": "Synapse-App" },
        });
        setSuggestions(res.data);
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 400);
  };

  const handleLocationInput = (e) => {
    setLocationInput(e.target.value);
    setSelectedLocation(null);
    fetchSuggestions(e.target.value);
  };

  const handleSelectSuggestion = (item) => {
    const label = item.display_name;
    setLocationInput(label);
    setSelectedLocation({ lat: Number.parseFloat(item.lat), lng: Number.parseFloat(item.lon), label });
    setSuggestions([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  };

  const urgencyClasses = (urgency) => {
    if (urgency === "High") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (urgency === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  const clearForm = () => {
    setForm({ complaintText: "", locationName: "" });
    setLocationInput("");
    setSelectedLocation(null);
    setSuggestions([]);
    setImageFile(null);
    setImagePreview("");
    setImpactCount("");
    setError("");
    setSource(INPUT_SOURCES[0]);
    setVoiceStatus(`Click start to record in ${selectedLang.label}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.complaintText.trim()) {
      setError("Please enter a community need description.");
      return;
    }
    if (!selectedLocation) {
      setError("Please select a location from the dropdown suggestions.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let textToSubmit = form.complaintText;
      let originalText = null;

      if (selectedLang.isoCode !== "en") {
        setIsTranslating(true);
        try {
          const transRes = await axios.post(`${API_BASE_URL}/api/translate`, {
            text: form.complaintText,
            sourceLang: selectedLang.isoCode,
            targetLang: "en",
          });
          originalText = form.complaintText;
          textToSubmit = transRes.data.translatedText || form.complaintText;
        } catch {
          // fall through with original text
        } finally {
          setIsTranslating(false);
        }
      }

      const response = await axios.post(`${API_BASE_URL}/api/complaints`, {
        text: textToSubmit,
        originalText,
        originalLang: selectedLang.isoCode,
        location: selectedLocation.label,
        citizenName: source,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });

      setSubmitResult({
        ...response.data,
        displayText: originalText || textToSubmit,
        source,
        impactCount,
        predictedNeedType,
        predictedUrgency,
        predictedResources,
      });

      alert(`Need captured. Need Type: ${response.data.category} | Urgency Score: ${response.data.priority}`);
      setTimeout(() => navigate("/complaints"), 1800);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Could not reach the server. Please check if Node and Python are running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Report a Community Need</h1>
              <p className="mt-1 text-sm text-slate-300">
                Reframed intake flow for Synapse: need detection, urgency scoring, resource prediction, and multilingual capture.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Input Language</label>
              <div className="relative">
                <select
                  value={selectedLang.isoCode}
                  onChange={(e) => {
                    const lang = LANGUAGES.find((item) => item.isoCode === e.target.value);
                    if (lang) setSelectedLang(lang);
                  }}
                  className="appearance-none rounded-lg border border-slate-600 bg-slate-800 py-2 pl-3 pr-8 text-sm font-semibold text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.isoCode} value={lang.isoCode}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">▼</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Reporting Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
                >
                  {INPUT_SOURCES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">People Impacted</label>
                <input
                  value={impactCount}
                  onChange={(e) => setImpactCount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 35"
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-[#1f4e79]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Community Need Description
                {selectedLang.isoCode !== "en" && (
                  <span className="ml-2 text-xs font-normal text-slate-400">(Write in {selectedLang.label})</span>
                )}
              </label>
              <textarea
                name="complaintText"
                value={form.complaintText}
                onChange={handleChange}
                rows={7}
                dir={selectedLang.isoCode === "ur" ? "rtl" : "ltr"}
                placeholder={
                  selectedLang.isoCode === "en"
                    ? "Example: 15 families in this area need food kits urgently after flooding."
                    : `Type the community need in ${selectedLang.label}…`
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
              />
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-200">Voice Need Input</h3>
                    <span className="rounded-full border border-blue-500/30 bg-blue-600/20 px-2 py-0.5 text-xs font-semibold text-blue-300">
                      {selectedLang.flag} {selectedLang.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{voiceStatus}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={startListening}
                    disabled={!voiceSupported || isListening}
                    className="rounded-lg bg-[#1f4e79] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#173a5b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isListening ? "🎙 Listening…" : "▶ Start Recording"}
                  </button>
                  <button
                    type="button"
                    onClick={stopListening}
                    disabled={!voiceSupported || !isListening}
                    className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ■ Stop
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Upload Supporting Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-slate-300"
              />
              {imagePreview && (
                <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <img src={imagePreview} alt="Preview" className="h-48 w-full rounded-lg object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">Location</label>
              <div className="relative" ref={suggestionsRef}>
                <input
                  type="text"
                  value={locationInput}
                  onChange={handleLocationInput}
                  placeholder="Start typing area, street, landmark, or village…"
                  className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
                />
                {isFetchingSuggestions && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
                {suggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                    {suggestions.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full border-b border-slate-700 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-700 last:border-0"
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedLocation && (
                  <p className="mt-1 text-xs text-green-400">
                    ✓ Location pinned — {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isTranslating}
                className="rounded-lg bg-[#1f4e79] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173a5b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTranslating ? "Translating…" : isSubmitting ? "Submitting…" : "Submit Community Need"}
              </button>
              <button
                type="button"
                onClick={clearForm}
                className="rounded-lg border border-slate-600 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Reset Form
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-lg font-bold text-white">AI Upgrade Preview</h2>
              <p className="mt-1 text-sm text-slate-400">Frontend-only preview of the upgraded Synapse intelligence layer.</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Need Detection</p>
                  <p className="mt-2 text-lg font-bold text-white">{predictedNeedType}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Urgency Score</p>
                  <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClasses(predictedUrgency)}`}>
                    {predictedUrgency}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Predicted Resource Requirements</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {predictedResources.map((item) => (
                      <span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Matching Logic Mode</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Rule + ML hybrid · similarity ranking · location + urgency + skills aware</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="text-lg font-bold text-white">Action Status Model</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "Detected",
                  "Assigned",
                  "In Progress",
                  "Completed",
                ].map((status) => (
                  <span key={status} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {status}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Latest Intake Summary</h2>
          <p className="mt-1 text-sm text-slate-300">Review the latest community need processed by the current backend.</p>
        </div>

        <div className="p-6">
          {submitResult ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Need Reference</p>
                  <p className="mt-1 text-xl font-bold text-white">#{submitResult.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClasses(submitResult.priority)}`}>
                    {submitResult.priority} Urgency
                  </span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    Detected
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Need Type", submitResult.category || submitResult.predictedNeedType],
                  ["Input Source", submitResult.source],
                  ["People Impacted", submitResult.impactCount || "—"],
                  ["Location", selectedLocation?.label || "Pinned"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {submitResult.originalText && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-400">
                    Original text ({selectedLang.label})
                  </p>
                  <p className="text-sm leading-6 text-slate-300" dir={selectedLang.isoCode === "ur" ? "rtl" : "ltr"}>
                    {submitResult.originalText}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm font-semibold text-slate-200">Need Details</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{submitResult.displayText}</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm font-semibold text-slate-200">Suggested Resources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {submitResult.predictedResources.map((item) => (
                    <span key={item} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-400">
              Submit a community need to see the Synapse intake summary here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterComplaintPage;

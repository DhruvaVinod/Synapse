import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000";

// Supported languages: label shown in UI, BCP-47 code for SpeechRecognition, ISO 639-1 for translation
const LANGUAGES = [
  { label: "English",    speechCode: "en-IN", isoCode: "en",  flag: "🇬🇧" },
  { label: "हिन्दी",      speechCode: "hi-IN", isoCode: "hi",  flag: "🇮🇳" },
  { label: "தமிழ்",      speechCode: "ta-IN", isoCode: "ta",  flag: "🇮🇳" },
  { label: "తెలుగు",     speechCode: "te-IN", isoCode: "te",  flag: "🇮🇳" },
  { label: "ಕನ್ನಡ",      speechCode: "kn-IN", isoCode: "kn",  flag: "🇮🇳" },
  { label: "മലയാളം",    speechCode: "ml-IN", isoCode: "ml",  flag: "🇮🇳" },
  { label: "मराठी",      speechCode: "mr-IN", isoCode: "mr",  flag: "🇮🇳" },
  { label: "বাংলা",      speechCode: "bn-IN", isoCode: "bn",  flag: "🇮🇳" },
  { label: "ਪੰਜਾਬੀ",     speechCode: "pa-IN", isoCode: "pa",  flag: "🇮🇳" },
  { label: "ગુજરાતી",   speechCode: "gu-IN", isoCode: "gu",  flag: "🇮🇳" },
  { label: "اردو",       speechCode: "ur-PK", isoCode: "ur",  flag: "🇵🇰" },
];

function RegisterComplaintPage() {
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
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

  // Re-init speech recognition whenever language changes
  useEffect(() => {
    setupSpeechRecognition(selectedLang.speechCode);
    setVoiceStatus(`Click start to record in ${selectedLang.label}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Stop any ongoing recognition before reinitialising
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }

      if (finalTranscript) {
        // Only append final confirmed words to the form
        setForm((prev) => ({
          ...prev,
          complaintText: `${prev.complaintText} ${finalTranscript}`.trim(),
        }));
      }

      // Show interim text as a live preview in the status bar only — don't save it
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

  // ---------- Location autocomplete ----------
  const fetchSuggestions = (query) => {
    clearTimeout(debounceRef.current);
    if (query.length < 3) { setSuggestions([]); return; }
    setIsFetchingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: query, format: "json", limit: 5, addressdetails: 1 },
          headers: { "User-Agent": "UrbanMind-App" },
        });
        setSuggestions(res.data);
      } catch { setSuggestions([]); }
      finally { setIsFetchingSuggestions(false); }
    }, 400);
  };

  const handleLocationInput = (e) => {
    setLocationInput(e.target.value);
    setSelectedLocation(null);
    fetchSuggestions(e.target.value);
  };

  const handleSelectSuggestion = (s) => {
    const label = s.display_name;
    setLocationInput(label);
    setSelectedLocation({ lat: parseFloat(s.lat), lng: parseFloat(s.lon), label });
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

  const priorityClasses = (priority) => {
    if (priority === "High")   return "border-red-500/30 bg-red-500/10 text-red-300";
    if (priority === "Medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    return "border-green-500/30 bg-green-500/10 text-green-300";
  };

  const clearForm = () => {
    setForm({ complaintText: "", locationName: "" });
    setLocationInput("");
    setSelectedLocation(null);
    setSuggestions([]);
    setImageFile(null);
    setImagePreview("");
    setError("");
    setVoiceStatus(`Click start to record in ${selectedLang.label}`);
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.complaintText.trim()) { setError("Please enter a complaint description."); return; }
    if (!selectedLocation) { setError("Please select a location from the dropdown suggestions."); return; }

    setIsSubmitting(true);
    setError("");

    try {
      // If the complaint is not in English, translate it first via the backend
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
          // Translation failed — still submit with original text
          console.warn("Translation failed, submitting original text");
        } finally {
          setIsTranslating(false);
        }
      }

      const response = await axios.post(`${API_BASE_URL}/api/complaints`, {
        text: textToSubmit,
        originalText,                        // preserved for display purposes
        originalLang: selectedLang.isoCode,
        location: selectedLocation.label,
        citizenName: "Shreya (Live User)",
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });

      setSubmitResult({ ...response.data, displayText: originalText || textToSubmit });
      alert(`Complaint submitted! Category: ${response.data.category} | Priority: ${response.data.priority}`);
      setTimeout(() => navigate("/complaints"), 2000);
    } catch (err) {
      console.error("Submission failed:", err);
      setError("Could not reach the server. Please check if Node and Python are running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Register a Complaint</h1>
              <p className="mt-1 text-sm text-slate-300">
                Submit your civic issue in any regional language — we'll handle the rest.
              </p>
            </div>

            {/* ── Language Selector ── */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Input Language
              </label>
              <div className="relative">
                <select
                  value={selectedLang.isoCode}
                  onChange={(e) => {
                    const lang = LANGUAGES.find((l) => l.isoCode === e.target.value);
                    if (lang) setSelectedLang(lang);
                  }}
                  className="appearance-none rounded-lg border border-slate-600 bg-slate-800 pl-3 pr-8 py-2 text-sm font-semibold text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.isoCode} value={l.isoCode}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
              </div>
              {selectedLang.isoCode !== "en" && (
                <p className="text-xs text-blue-400 mt-0.5">
                  Text will be auto-translated to English before processing.
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Complaint Text */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Complaint Description
              {selectedLang.isoCode !== "en" && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (Write in {selectedLang.label})
                </span>
              )}
            </label>
            <textarea
              name="complaintText"
              value={form.complaintText}
              onChange={handleChange}
              rows={6}
              dir={selectedLang.isoCode === "ur" ? "rtl" : "ltr"}
              placeholder={
                selectedLang.isoCode === "en"
                  ? "Example: Garbage has not been collected for two days near the main road."
                  : `Type your complaint in ${selectedLang.label}…`
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
            />
          </div>

          {/* Voice Input */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">Voice Complaint Input</h3>
                  <span className="text-xs rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 font-semibold">
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

          {/* Image Upload */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">
              Upload Supporting Image
            </label>
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

          {/* Location Autocomplete */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-200">Location</label>
            <div className="relative" ref={suggestionsRef}>
              <input
                type="text"
                value={locationInput}
                onChange={handleLocationInput}
                placeholder="Start typing your area, street or landmark…"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-slate-200 outline-none transition placeholder:text-slate-400 focus:border-[#1f4e79] focus:ring-2 focus:ring-[#1f4e79]/20"
              />
              {isFetchingSuggestions && (
                <p className="mt-1 text-xs text-slate-400">Searching…</p>
              )}
              {suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                  {suggestions.map((s) => (
                    <button
                      key={s.place_id}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full border-b border-slate-700 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-slate-700 last:border-0"
                    >
                      {s.display_name}
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isTranslating}
              className="rounded-lg bg-[#1f4e79] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173a5b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTranslating ? "Translating…" : isSubmitting ? "Submitting…" : "Submit Complaint"}
            </button>
            <button
              type="button"
              onClick={clearForm}
              className="rounded-lg border border-slate-600 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Reset Form
            </button>
          </div>
        </form>
      </div>

      {/* Submission Summary */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Submission Summary</h2>
          <p className="mt-1 text-sm text-slate-300">
            Review the latest complaint processed by the system.
          </p>
        </div>

        <div className="p-6">
          {submitResult ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Complaint Reference
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">#{submitResult.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityClasses(submitResult.priority)}`}>
                    {submitResult.priority} Priority
                  </span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                    {submitResult.status}
                  </span>
                </div>
              </div>

              {/* Show original language text if translated */}
              {submitResult.originalText && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-400 mb-1">
                    Your original complaint ({selectedLang.label})
                  </p>
                  <p className="text-sm leading-6 text-slate-300" dir={selectedLang.isoCode === "ur" ? "rtl" : "ltr"}>
                    {submitResult.originalText}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-sm font-semibold text-slate-200">
                  Complaint Details{submitResult.originalText ? " (Translated to English)" : ""}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{submitResult.displayText}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</p>
                  <p className="mt-2 text-base font-semibold text-white">{submitResult.category}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted On</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {submitResult.createdAt ? new Date(submitResult.createdAt).toLocaleString() : "Just now"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recorded Location</p>
                <p className="mt-2 text-sm font-medium text-slate-200">{submitResult.location}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {submitResult.lat?.toFixed(5)}, {submitResult.lng?.toFixed(5)}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800 p-8 text-center">
              <p className="text-sm font-semibold text-slate-300">No complaint submitted yet</p>
              <p className="mt-2 text-sm text-slate-400">
                The latest processed complaint will appear here after submission.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterComplaintPage;

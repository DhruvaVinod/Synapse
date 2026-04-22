// translationService.js
// Drop this file next to your Express routes (e.g. routes/translationService.js)
// Node.js proxy so the React frontend never calls the Python service directly.

const axios = require("axios");

const PYTHON_API = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";

/**
 * Translate text via the Python FastAPI microservice.
 *
 * @param {string} text        - Text to translate
 * @param {string} sourceLang  - ISO 639-1 source language code (e.g. "hi")
 * @param {string} targetLang  - ISO 639-1 target language code (e.g. "en")
 * @returns {Promise<string>}  - Translated text (falls back to original on error)
 */
async function translateText(text, sourceLang = "en", targetLang = "en") {
  if (!text || sourceLang === targetLang) return text;

  try {
    const response = await axios.post(`${PYTHON_API}/translate`, {
      text,
      sourceLang,
      targetLang,
    });
    return response.data.translatedText || text;
  } catch (err) {
    console.error("[TranslationService] Translation failed:", err.message);
    return text; // graceful degradation
  }
}

module.exports = { translateText };

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: How to wire this into your Express complaints route
// (add these lines to wherever you handle POST /api/complaints)
// ─────────────────────────────────────────────────────────────────────────────
//
// const { translateText } = require("./translationService");
//
// router.post("/api/complaints", async (req, res) => {
//   const {
//     text,
//     originalText,   // already-translated original text (sent from frontend)
//     originalLang,   // e.g. "hi"
//     location,
//     citizenName,
//     lat,
//     lng,
//   } = req.body;
//
//   // The frontend already translated text → English before sending,
//   // so `text` is always English here.  We just persist both.
//
//   try {
//     // Call your existing Python /predict endpoint
//     const aiResponse = await axios.post(`${PYTHON_API}/predict`, { text });
//     const { category, priority } = aiResponse.data.prediction;
//
//     const complaint = await Complaint.create({
//       text,
//       originalText: originalText || null,
//       originalLang: originalLang || "en",
//       category,
//       priority,
//       location,
//       citizenName,
//       lat,
//       lng,
//       status: "Pending",
//     });
//
//     res.json({
//       id: complaint._id,
//       ...complaint.toObject(),
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });
//
// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE: How to wire this into GET /api/complaints (view translation)
// ─────────────────────────────────────────────────────────────────────────────
//
// router.get("/api/translate", async (req, res) => {  <-- or POST, see below
//   // This endpoint is called by ComplaintsPage when the user switches language
// });
//
// router.post("/api/translate", async (req, res) => {
//   const { text, sourceLang, targetLang } = req.body;
//   const translatedText = await translateText(text, sourceLang, targetLang);
//   res.json({ translatedText });
// });

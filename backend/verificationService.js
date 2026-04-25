const { GoogleGenAI } = require('@google/genai');
const Need = require('./models/Need');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = degToRad(lat2 - lat1);
  const dLng = degToRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(lat1)) *
      Math.cos(degToRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkSimilarComplaints(need) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentNeeds = await Need.find({
    _id: { $ne: need._id },
    createdAt: { $gte: since },
    needType: need.needType,
    lat: { $exists: true },
    lng: { $exists: true },
  }).lean();

  const nearbySimilar = recentNeeds.filter((n) => {
    if (typeof n.lat !== 'number' || typeof n.lng !== 'number') return false;
    return distanceKm(need.lat, need.lng, n.lat, n.lng) <= 5;
  });

  return nearbySimilar.length;
}

async function checkGeminiPlausibility(need) {
  try {
    const prompt = `
You are verifying a civic complaint submitted by a citizen.

Complaint text:
"${need.text}"

Location:
"${need.location || 'Unknown'}"

Predicted category:
"${need.needType}"

Predicted urgency:
"${need.urgencyScore}"

Return ONLY valid JSON in this format:
{
  "plausibilityScore": 0-100,
  "status": "Likely Genuine" | "Needs Review" | "Likely Fake",
  "reasons": ["short reason 1", "short reason 2"]
}

Judge whether the complaint is specific, plausible, non-spammy, and civic-service related.
Do not reject a complaint just because you cannot independently verify it.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const clean = response.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      score: Number(parsed.plausibilityScore || 50),
      status: parsed.status || 'Needs Review',
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Gemini returned unclear reasoning'],
    };
  } catch (err) {
    console.error('Gemini verification failed:', err.message);

    return {
      score: 50,
      status: 'Needs Review',
      reasons: ['Gemini verification failed or returned invalid JSON'],
    };
  }
}

async function verifyNeed(need) {
  const similarComplaintCount = await checkSimilarComplaints(need);
  const geminiResult = await checkGeminiPlausibility(need);

  let finalScore = geminiResult.score;
  const reasons = [...geminiResult.reasons];

  if (similarComplaintCount >= 3) {
    finalScore += 20;
    reasons.push(`${similarComplaintCount} similar complaints found nearby in the last 24 hours`);
  } else if (similarComplaintCount >= 1) {
    finalScore += 10;
    reasons.push(`${similarComplaintCount} similar complaint(s) found nearby in the last 24 hours`);
  } else {
    reasons.push('No similar nearby complaints found in the last 24 hours');
  }

  finalScore = Math.max(0, Math.min(100, finalScore));

  let verificationStatus = geminiResult.status;

  if (finalScore >= 75) verificationStatus = 'Likely Genuine';
  else if (finalScore >= 40) verificationStatus = 'Needs Review';
  else verificationStatus = 'Likely Fake';

  return {
    verificationStatus,
    verificationScore: finalScore,
    verificationReasons: reasons,
    similarComplaintCount,
    verifiedAt: new Date(),
  };
}

module.exports = { verifyNeed };
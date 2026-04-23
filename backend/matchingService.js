// matchingService.js
// Core of Synapse: matches a Need to the best available Volunteers
// Strategy: score each available volunteer by skill match + proximity + urgency weight

const Volunteer = require('./models/Volunteer');

/**
 * Haversine distance between two lat/lng points (returns km)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Map needType → required volunteer skills
 */
const NEED_SKILL_MAP = {
  Health:        ['medical', 'counseling'],
  Disaster:      ['rescue', 'logistics', 'medical'],
  Food:          ['food', 'logistics'],
  Infrastructure:['technical', 'logistics'],
  Education:     ['teaching'],
  General:       ['general'],
  Sanitation:    ['logistics', 'general'],
  Water:         ['technical', 'general'],
  Electricity:   ['technical'],
  Animal:        ['general'],
};

/**
 * Score a single volunteer against a need.
 * Higher = better match.
 *
 * Scoring breakdown:
 *   - Skill match:  up to 50 points
 *   - Proximity:    up to 30 points (closer = higher)
 *   - Availability: 20 points bonus
 */
function scoreVolunteer(volunteer, need) {
  let score = 0;

  // 1. Skill match
  const requiredSkills = NEED_SKILL_MAP[need.needType] || ['general'];
  const volunteerSkills = volunteer.skills || [];
  const matchedSkills = requiredSkills.filter((s) => volunteerSkills.includes(s));
  score += (matchedSkills.length / requiredSkills.length) * 50;

  // 2. Proximity (only if both have coordinates)
  if (volunteer.lat && volunteer.lng && need.lat && need.lng) {
    const distKm = haversineKm(volunteer.lat, volunteer.lng, need.lat, need.lng);
    // 0 km → 30 pts, 50 km → 0 pts, linear
    score += Math.max(0, 30 - (distKm / 50) * 30);
  }

  // 3. Availability bonus
  if (volunteer.availability) score += 20;

  return Math.round(score);
}

/**
 * Find and rank volunteers for a given need.
 *
 * @param {Object} need  - Mongoose Need document
 * @param {number} limit - Max volunteers to return (default 5)
 * @returns {Array}      - Sorted array of { volunteer, score }
 */
async function matchVolunteers(need, limit = 5) {
  // Only consider available volunteers not already overloaded (≤3 active tasks)
  const volunteers = await Volunteer.find({ availability: true }).lean();

  const scored = volunteers
    .map((v) => ({ volunteer: v, score: scoreVolunteer(v, need) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

module.exports = { matchVolunteers };
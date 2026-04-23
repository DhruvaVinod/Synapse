// routes.js  –  Synapse
const express = require('express');
const router  = express.Router();
const {
  // Needs (replaces Complaints)
  getAllNeeds,
  createNeed,
  getNeedById,
  updateNeed,

  // Volunteers
  registerVolunteer,
  getAllVolunteers,
  getVolunteerById,
  toggleVolunteerAvailability,

  // Coordination
  getCoordinationNeeds,
  getMatchSuggestions,
  assignVolunteers,

  // Resources
  getAllResources,
  createResource,
  allocateResource,

  // Stats + Admin
  getStats,
  adminLogin,
} = require('./controller');

const { translateText } = require('./translationService');

// ── Needs  (/api/needs  AND  /api/complaints  for frontend compatibility) ──
router.get('/needs',            getAllNeeds);
router.post('/needs',           createNeed);
router.get('/needs/:id',        getNeedById);
router.patch('/needs/:id',      updateNeed);

// Keep old paths so RegisterComplaintPage / TrackComplaintPage still work
router.get('/complaints',            getAllNeeds);
router.post('/complaints',           createNeed);
router.get('/complaints/:id',        getNeedById);
router.patch('/complaints/:id',      updateNeed);

// ── Volunteers  ──────────────────────────────────────────────────────────────
router.post('/volunteers',                          registerVolunteer);
router.get('/volunteers',                           getAllVolunteers);
router.get('/volunteers/:id',                       getVolunteerById);
router.patch('/volunteers/:id/availability',        toggleVolunteerAvailability);

// ── Coordination  ────────────────────────────────────────────────────────────
router.get('/coordination/needs',                   getCoordinationNeeds);
router.get('/coordination/match/:needId',           getMatchSuggestions);
router.post('/coordination/assign',                 assignVolunteers);
router.get('/coordination/resources',               getAllResources);

// ── Resources  ───────────────────────────────────────────────────────────────
router.get('/resources',                            getAllResources);
router.post('/resources',                           createResource);
router.patch('/resources/:id/allocate',             allocateResource);

// ── Stats & Admin  ───────────────────────────────────────────────────────────
router.get('/stats',                                getStats);
router.post('/admin/login',                         adminLogin);

// ── Translation proxy  ───────────────────────────────────────────────────────
router.post('/translate', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;
  const translatedText = await translateText(text, sourceLang, targetLang);
  res.json({ translatedText });
});

module.exports = router;
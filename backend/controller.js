// controller.js  –  Synapse
const Need      = require('./models/Need');
const Volunteer = require('./models/Volunteer');
const Resource  = require('./models/Resource');
const axios     = require('axios');
const { translateText }    = require('./translationService');

// REMOVED matchingService import - AI handles this now!
const { notifyAdminsUrgent, notifyVolunteer } = require('./alertService');

// ─────────────────────────────────────────────────────────────────────────────
// SEED
// ─────────────────────────────────────────────────────────────────────────────
const seedCSV = async () => {
  const count = await Need.countDocuments();
  if (count > 0) return;

  const fs   = require('fs');
  const csv  = require('csv-parser');
  const path = require('path');
  const rows = [];

  fs.createReadStream(path.join(__dirname, 'municipal_complaints.csv'))
    .pipe(csv())
    .on('data', (row) => {
      const text = row.complaints || '';
      const needType = row.category || 'General';
      rows.push({
        text,
        needType,
        category: needType,
        urgencyScore: /urgent|emergency|fire/i.test(text) ? 'High' : 'Medium',
        priority:     /urgent|emergency|fire/i.test(text) ? 'High' : 'Medium',
        status: 'Completed',
        lat: 28.6 + (Math.random() - 0.5) * 0.1,
        lng: 77.2 + (Math.random() - 0.5) * 0.1,
      });
    })
    .on('end', async () => {
      await Need.insertMany(rows);
      console.log(`✅ Seeded ${rows.length} needs into MongoDB`);
    });
};

seedCSV();

// ─────────────────────────────────────────────────────────────────────────────
// NEEDS
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllNeeds = async (req, res) => {
  const needs = await Need.find()
    .sort({ createdAt: -1 })
    .populate('assignedVolunteers', 'name skills')
    .lean();
  res.json(needs.map((n) => ({ ...n, id: n._id })));
};

exports.createNeed = async (req, res) => {
  const {
    text, location, citizenName,
    lat, lng, originalLang,
    reporterType,
    resourcesRequired,
  } = req.body;

  if (!text) return res.status(400).json({ error: 'Text is required' });

  // 1. Translate to English for AI
  let englishText = text;
  if (originalLang && originalLang !== 'en') {
    console.log(`🌐 Translating from ${originalLang} to English...`);
    englishText = await translateText(text, originalLang, 'en');
    console.log(`✅ Translated: "${englishText}"`);
  }

  // 2. AI classification & Volunteer Matching
  let needType = 'General', urgencyScore = 'Low', aiResources = "General", aiMatches = [];
  const safeLat = lat || 28.6139;
  const safeLng = lng || 77.2090;

  try {
    // Send text AND coordinates to the Python AI Module
    const mlRes = await axios.post('http://127.0.0.1:8000/predict', { 
        text: englishText,
        lat: safeLat,
        lng: safeLng
    });
    
    needType     = mlRes.data.prediction.predicted_department;
    urgencyScore = mlRes.data.prediction.priority_level;
    aiResources  = mlRes.data.prediction.resources_needed;
    aiMatches    = mlRes.data.prediction.recommended_volunteers;
    
  } catch (err) {
    console.error("⚠️ AI Module unreachable, using fallbacks:", err.message);
    // Fallback rules
    if      (/water|leak|pipe/i.test(englishText))                                             needType = 'Water';
    else if (/light|power|electric|current/i.test(englishText))                               needType = 'Electricity';
    else if (/dog|cat|animal|stray/i.test(englishText))                                       needType = 'Animal';
    else if (/waste|garbage|dirty|smell/i.test(englishText))                                  needType = 'Sanitation';
    else if (/disaster|fire|volcano|tornado|cyclone|tsunami|earthquake|flood/i.test(englishText)) needType = 'Disaster';
    else if (/food|hunger|starv/i.test(englishText))                                          needType = 'Food';
    else if (/hospital|medic|doctor|injur|sick/i.test(englishText))                           needType = 'Health';

    urgencyScore = /urgent|emergency|critical|severe/i.test(englishText) ? 'High' : 'Medium';
  }

  // 3. Save
  const need = await Need.create({
    text,
    originalText: originalLang && originalLang !== 'en' ? text : null,
    originalLang: originalLang || 'en',
    needType,
    category:     needType,
    urgencyScore,
    priority:     urgencyScore === 'Critical' ? 'High' : urgencyScore,
    location:     location   || 'Unknown',
    citizenName:  citizenName || 'Anonymous',
    reporterType: reporterType === "citizen report" ? "citizen" : (reporterType || "citizen"),
    status:       'Detected',
    lat:          safeLat,
    lng:          safeLng,
    resourcesRequired: resourcesRequired || [], // Save the AI suggested resources
  });

  // 4. Real-time alert to admins if urgent
  notifyAdminsUrgent(need);

  // Return the created need PLUS the AI's instant volunteer recommendations
  // THE FIX: Add aiSuggestedResources to the output
  res.status(201).json({ 
      ...need.toObject(), 
      id: need._id, 
      suggestedVolunteers: aiMatches,
      aiSuggestedResources: aiResources 
  });
};

exports.getNeedById = async (req, res) => {
  const need = await Need.findById(req.params.id)
    .populate('assignedVolunteers', 'name skills phone')
    .lean();
  if (!need) return res.status(404).json({ error: 'Not found' });
  res.json({ ...need, id: need._id });
};

exports.updateNeed = async (req, res) => {
  const { adminReply, status } = req.body;
  const update = {};
  if (adminReply !== undefined) update.adminReply = adminReply;
  if (status)                   update.status     = status;
  if (status === 'Completed')   update.closedAt   = new Date();

  const need = await Need.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!need) return res.status(404).json({ error: 'Not found' });
  res.json({ ...need.toObject(), id: need._id });
};

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTEERS
// ─────────────────────────────────────────────────────────────────────────────

exports.registerVolunteer = async (req, res) => {
  const { name, email, phone, skills, location, lat, lng } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const volunteer = await Volunteer.create({
    name, email, phone,
    skills:   skills   || ['general'],
    location: location || 'Unknown',
    lat, lng,
  });
  res.status(201).json({ ...volunteer.toObject(), id: volunteer._id });
};

exports.getAllVolunteers = async (req, res) => {
  const volunteers = await Volunteer.find()
    .sort({ createdAt: -1 })
    .populate('assignedNeeds', 'needType urgencyScore status')
    .lean();
  res.json(volunteers.map((v) => ({ ...v, id: v._id })));
};

exports.getVolunteerById = async (req, res) => {
  const v = await Volunteer.findById(req.params.id)
    .populate('assignedNeeds', 'needType urgencyScore status location')
    .lean();
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json({ ...v, id: v._id });
};

exports.toggleVolunteerAvailability = async (req, res) => {
  const v = await Volunteer.findById(req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  v.availability = !v.availability;
  await v.save();
  res.json({ id: v._id, availability: v.availability });
};

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATION  (AI Driven Matching)
// ─────────────────────────────────────────────────────────────────────────────

exports.getCoordinationNeeds = async (req, res) => {
  const needs = await Need.find({ status: { $ne: 'Completed' } })
    .sort({ createdAt: -1 })
    .populate('assignedVolunteers', 'name skills availability')
    .lean();
  res.json(needs.map((n) => ({ ...n, id: n._id })));
};

exports.getMatchSuggestions = async (req, res) => {
  const need = await Need.findById(req.params.needId).lean();
  if (!need) return res.status(404).json({ error: 'Need not found' });

  try {
      // Ask the Python AI for live match suggestions based on the saved need
      const mlRes = await axios.post('http://127.0.0.1:8000/predict', { 
          text: need.originalLang === 'en' ? need.text : (need.originalText || need.text),
          lat: need.lat,
          lng: need.lng
      });
      
      const matches = mlRes.data.prediction.recommended_volunteers;
      res.json({ needId: need._id, matches });
      
  } catch (err) {
      console.error("⚠️ AI Matcher unreachable:", err.message);
      res.status(500).json({ error: 'AI matching service is currently down.' });
  }
};

exports.assignVolunteers = async (req, res) => {
  const { needId, volunteerIds } = req.body;
  if (!needId || !volunteerIds?.length)
    return res.status(400).json({ error: 'needId and volunteerIds are required' });

  const need = await Need.findById(needId);
  if (!need) return res.status(404).json({ error: 'Need not found' });

  const existing = need.assignedVolunteers.map(String);
  const toAdd    = volunteerIds.filter((id) => !existing.includes(String(id)));
  need.assignedVolunteers.push(...toAdd);
  need.status = 'Assigned';
  await need.save();

  for (const vid of toAdd) {
    await Volunteer.findByIdAndUpdate(vid, { $addToSet: { assignedNeeds: needId } });
    notifyVolunteer(vid, need);
  }

  const populated = await Need.findById(needId)
    .populate('assignedVolunteers', 'name skills phone')
    .lean();
  res.json({ ...populated, id: populated._id });
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

exports.getAllResources = async (req, res) => {
  const resources = await Resource.find().sort({ createdAt: -1 }).lean();
  res.json(resources.map((r) => ({ ...r, id: r._id })));
};

exports.createResource = async (req, res) => {
  const { type, name, quantity, unit, location, lat, lng } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'type and name are required' });

  const resource = await Resource.create({ type, name, quantity, unit, location, lat, lng });
  res.status(201).json({ ...resource.toObject(), id: resource._id });
};

exports.allocateResource = async (req, res) => {
  const { needId } = req.body;
  const resource = await Resource.findByIdAndUpdate(
    req.params.id,
    { allocatedTo: needId || null, available: !needId },
    { new: true }
  );
  if (!resource) return res.status(404).json({ error: 'Not found' });
  res.json({ ...resource.toObject(), id: resource._id });
};

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT METRICS
// ─────────────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  const needs      = await Need.find().lean();
  const volunteers = await Volunteer.find().lean();
  const resources  = await Resource.find().lean();

  const total     = needs.length;
  const completed = needs.filter((n) => n.status === 'Completed').length;
  const pending   = needs.filter((n) => n.status === 'Detected').length;
  const assigned  = needs.filter((n) => n.status === 'Assigned').length;
  const inProgress = needs.filter((n) => n.status === 'In Progress').length;

  const responseTimes = needs
    .filter((n) => n.status !== 'Detected' && n.updatedAt && n.createdAt)
    .map((n) => (new Date(n.updatedAt) - new Date(n.createdAt)) / 60000); 
  const avgResponseMin = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  const byNeedType  = {};
  const byUrgency   = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  needs.forEach((n) => {
    byNeedType[n.needType] = (byNeedType[n.needType] || 0) + 1;
    if (byUrgency[n.urgencyScore] !== undefined) byUrgency[n.urgencyScore]++;
  });

  res.json({
    needs: { total, completed, pending, assigned, inProgress },
    resolutionRate: total ? Math.round((completed / total) * 100) : 0,
    avgResponseMin,
    byNeedType,
    byUrgency,
    volunteers: {
      total: volunteers.length,
      available: volunteers.filter((v) => v.availability).length,
      tasksCompleted: volunteers.reduce((s, v) => s + v.tasksCompleted, 0),
    },
    resources: {
      total: resources.length,
      available: resources.filter((r) => r.available).length,
    },
  });
};

exports.adminLogin = (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
};
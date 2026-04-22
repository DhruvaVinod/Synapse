const Complaint = require('./models/Complaint');
const axios = require('axios');
const { translateText } = require('./translationService');

// Seed CSV data once into DB (run only if collection is empty)
const seedCSV = async () => {
  const count = await Complaint.countDocuments();
  if (count > 0) return; // already seeded

  const fs = require('fs');
  const csv = require('csv-parser');
  const path = require('path');
  const rows = [];

  fs.createReadStream(path.join(__dirname, 'municipal_complaints.csv'))
    .pipe(csv())
    .on('data', (row) => {
      const text = row.complaints || '';
      rows.push({
        text,
        category: row.category || 'General',
        priority: /urgent|emergency|fire/i.test(text) ? 'High' : 'Medium',
        status: 'Resolved',
        lat: 28.6 + (Math.random() - 0.5) * 0.1,
        lng: 77.2 + (Math.random() - 0.5) * 0.1,
      });
    })
    .on('end', async () => {
      await Complaint.insertMany(rows);
      console.log(`✅ Seeded ${rows.length} complaints into MongoDB`);
    });
};

seedCSV();

exports.getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find().sort({ createdAt: -1 }).lean();
  res.json(complaints.map(c => ({ ...c, id: c._id })));
};

exports.createComplaint = async (req, res) => {
  const { text, location, citizenName, lat, lng, originalLang } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  // Translate to English before sending to AI
  let englishText = text;
  if (originalLang && originalLang !== 'en') {
    console.log(`🌐 Translating from ${originalLang} to English...`);
    englishText = await translateText(text, originalLang, 'en');
    console.log(`✅ Translated: "${englishText}"`);
  }

  let category = 'General', priority = 'Low';

  try {
    const mlRes = await axios.post('http://127.0.0.1:8000/predict', { text: englishText });
    category = mlRes.data.prediction.predicted_department;
    priority = mlRes.data.prediction.priority_level;
  } catch {
    if (/water|leak|pipe/i.test(englishText)) category = 'Water';
    else if (/light|power|electric|current/i.test(englishText)) category = 'Electricity';
    else if (/dog|cat|animal|stray/i.test(englishText)) category ='Animal';
    else if (/waste|garbage|dirty|smell/i.test(englishText)) category = 'Garbage';
    else if (/disaster|fire|volcano|tornado|cyclone|tsunami|earthquake|flood|leak/i.test(englishText)) category ='Disaster';
  }

  const complaint = await Complaint.create({
    text,           // store original as typed by user
    category, priority,
    location: location || 'Unknown',
    citizenName: citizenName || 'Anonymous',
    status: 'Pending',
    lat: lat || 28.6139,
    lng: lng || 77.2090,
  });

  res.status(201).json({ ...complaint.toObject(), id: complaint._id });
};

exports.getStats = async (req, res) => {
  const complaints = await Complaint.find().lean();
  const stats = { total: complaints.length, byCategory: {}, byPriority: { High: 0, Medium: 0, Low: 0 } };
  complaints.forEach(c => {
    stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
    if (stats.byPriority[c.priority] !== undefined) stats.byPriority[c.priority]++;
  });
  res.json(stats);
};

exports.updateComplaint = async (req, res) => {
  const { adminReply, status } = req.body;
  const update = {};
  if (adminReply !== undefined) update.adminReply = adminReply;
  if (status)                   update.status = status;
  if (status === 'Resolved')    update.closedAt = new Date();

  const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!complaint) return res.status(404).json({ error: 'Not found' });
  res.json({ ...complaint.toObject(), id: complaint._id });
};

exports.adminLogin = (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
};

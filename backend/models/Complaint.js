// models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // The English version (used for AI classification)
    text: { type: String, required: true },

    // The user's original text if it was written in a regional language
    // (null when the complaint was submitted in English)
    originalText: { type: String, default: null },

    // ISO 639-1 code of the original language, e.g. "hi", "ta", "ml"
    originalLang: { type: String, default: 'en' },

    category:    { type: String, default: 'General' },
    priority:    { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    location:    { type: String, default: 'Unknown' },
    citizenName: { type: String, default: 'Anonymous' },
    status:      { type: String, default: 'Pending' },
    lat:         { type: Number },
    lng:         { type: Number },
    adminReply:  { type: String, default: '' },
    closedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);

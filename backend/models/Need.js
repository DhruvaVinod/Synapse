// models/Need.js  (replaces Complaint.js)
const mongoose = require('mongoose');

const needSchema = new mongoose.Schema(
  {
    // ── Text content ──────────────────────────────────────────────
    text:         { type: String, required: true },   // English (used for AI)
    originalText: { type: String, default: null },    // user's regional language text
    originalLang: { type: String, default: 'en' },    // ISO 639-1 code e.g. "hi"

    // ── AI Classification ─────────────────────────────────────────
    // "category" kept as alias so old frontend references don't break
    needType:  { type: String, default: 'General' },  // Health, Food, Disaster, etc.
    category:  { type: String, default: 'General' },  // mirror of needType

    // "priority" kept as alias; urgencyScore is the canonical field
    urgencyScore: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
    priority:     { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }, // mirror

    // ── Location ──────────────────────────────────────────────────
    location: { type: String, default: 'Unknown' },
    lat:      { type: Number },
    lng:      { type: Number },

    // ── Reporter ──────────────────────────────────────────────────
    citizenName:  { type: String, default: 'Anonymous' },
    reporterType: { type: String, enum: ['citizen', 'ngo', 'survey', 'bulk'], default: 'citizen' },

    // ── Action Status (replaces Pending/Resolved) ─────────────────
    status: {
      type: String,
      enum: ['Detected', 'Assigned', 'In Progress', 'Completed'],
      default: 'Detected',
    },

    // ── Volunteer Assignment ───────────────────────────────────────
    assignedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' }],

    // ── Resources needed ──────────────────────────────────────────
    resourcesRequired: [
      {
        type:     { type: String },  // 'food', 'medicine', 'vehicle', 'funds'
        quantity: { type: Number, default: 1 },
      },
    ],

    // ── Admin ─────────────────────────────────────────────────────
    adminReply: { type: String, default: '' },
    closedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Need', needSchema);
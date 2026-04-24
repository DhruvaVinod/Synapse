// models/Need.js
const mongoose = require('mongoose');

const needSchema = new mongoose.Schema(
  {
    text:         { type: String, required: true },
    originalText: { type: String, default: null },
    originalLang: { type: String, default: 'en' },

    needType:  { type: String, default: 'General' },
    category:  { type: String, default: 'General' },

    // UPDATED: Added 'Critical' to priority enum to match AI output
    urgencyScore: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
    priority:     { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },

    location: { type: String, default: 'Unknown' },
    lat:      { type: Number },
    lng:      { type: Number },

    citizenName:  { type: String, default: 'Anonymous' },
    // UPDATED: Added 'citizen report' and others to match frontend input sources
    reporterType: { 
      type: String, 
      enum: ['citizen', 'ngo', 'survey', 'bulk', 'citizen report', 'ngo field report', 'survey upload', 'bulk ingestion'], 
      default: 'citizen' 
    },

    status: {
      type: String,
      enum: ['Detected', 'Assigned', 'In Progress', 'Completed'],
      default: 'Detected',
    },

    assignedVolunteers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' }],

    // UPDATED: Changed to mixed/flexible type. 
    // The AI returns a raw string of resources, while the frontend might send an array.
    resourcesRequired: { type: mongoose.Schema.Types.Mixed, default: [] },

    adminReply: { type: String, default: '' },
    closedAt:   { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Need', needSchema);
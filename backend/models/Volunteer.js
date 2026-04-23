// models/Volunteer.js
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, default: '' },
    phone:        { type: String, default: '' },

    // Skills used by the matching engine
    skills: [
      {
        type: String,
        enum: ['medical', 'logistics', 'teaching', 'rescue', 'counseling', 'food', 'technical', 'general'],
      },
    ],

    availability: { type: Boolean, default: true },

    location: { type: String, default: 'Unknown' },
    lat:      { type: Number },
    lng:      { type: Number },

    // Tasks this volunteer is assigned to
    assignedNeeds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Need' }],

    // Simple performance tracking
    tasksCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Volunteer', volunteerSchema);
// models/Volunteer.js
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, default: '' },
    phone:        { type: String, default: '' },

    // UPDATED: Expanded enum to match AI search keywords (e.g., 'first_aid', 'technical')
    skills: [
      {
        type: String,
        enum: [
          'medical', 'logistics', 'teaching', 'rescue', 'counseling', 
          'food', 'technical', 'general', 'first_aid', 'medical_aid', 'driving'
        ],
      },
    ],

    availability: { type: Boolean, default: true },
    location:     { type: String, default: 'Unknown' },
    lat:          { type: Number },
    lng:          { type: Number },

    assignedNeeds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Need' }],
    tasksCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Volunteer', volunteerSchema);
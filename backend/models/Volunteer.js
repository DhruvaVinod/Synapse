// models/Volunteer.js
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    volunteer_id: { type: String, unique: true }, // e.g., VOL001
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    city: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    skills: [
      {
        type: String,
        enum: ['medical', 'shelter', 'education', 'elderly support', 'disaster relief', 'food', 'hygiene'],
      },
    ],
    profile_text: { type: String, default: '' },
    availability: { type: Boolean, default: true },
    current_load: { type: Number, default: 0 },
    max_load: { type: Number, default: 3 },
    rating: { type: Number, default: 5.0 },
    completed_count: { type: Number, default: 0 },
    assignedNeeds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Need' }]
  },
  { timestamps: true }
);

// Auto-generate volunteer_id before saving
// Remove 'next' from the function parameters and delete the next() call
volunteerSchema.pre('save', async function () {
  if (!this.volunteer_id) {
    const count = await mongoose.model('Volunteer').countDocuments();
    this.volunteer_id = `VOL${String(count + 1).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
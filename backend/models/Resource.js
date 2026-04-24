// models/Resource.js
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    // UPDATED: Added more types to match AI predictions
    type: { 
      type: String, 
      enum: ['food', 'medicine', 'vehicle', 'funds', 'other', 'equipment', 'team'], 
      required: true 
    },
    name:     { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit:     { type: String, default: 'units' },

    location: { type: String, default: 'Unknown' },
    lat:      { type: Number },
    lng:      { type: Number },

    available:   { type: Boolean, default: true },
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Need', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);
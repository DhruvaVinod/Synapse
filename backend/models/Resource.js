// models/Resource.js
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    type:     { type: String, enum: ['food', 'medicine', 'vehicle', 'funds', 'other'], required: true },
    name:     { type: String, required: true },   // e.g. "Rice bags", "Ambulance"
    quantity: { type: Number, default: 0 },
    unit:     { type: String, default: 'units' }, // kg, litres, count, ₹

    location: { type: String, default: 'Unknown' },
    lat:      { type: Number },
    lng:      { type: Number },

    available: { type: Boolean, default: true },

    // Which need this resource is currently allocated to (null = free)
    allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Need', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);
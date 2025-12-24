const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyAddress: {
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  price: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    priceType: { 
      type: String, 
      enum: ['sale', 'rent', 'lease'],
      required: true 
    },
    pricePerSquareUnit: { type: Number }
  },
  distanceFromTransport: {
    railwayStation: {
      distance: { type: Number, required: true },
      unit: { type: String, default: 'km' },
      nearestStationName: { type: String, required: true },
      walkingTime: { type: Number }
    },
    busStand: {
      distance: { type: Number, required: true },
      unit: { type: String, default: 'km' },
      nearestBusStandName: { type: String, required: true },
      walkingTime: { type: Number }
    }
  },
  images: {
    type: [
      {
        url: { type: String, required: true },
        caption: { type: String },
        isPrimary: { type: Boolean, default: false },
        uploadDate: { type: Date, default: Date.now }
      }
    ],
    validate: [arrayLimit, '{PATH} exceeds the limit of 5']
  },
  dimensions: {
    plotArea: {
      value: { type: Number, required: true },
      unit: { 
        type: String, 
        enum: ['sqft', 'sqmt', 'acre'],
        default: 'sqft'
      }
    },
    builtUpArea: {
      value: { type: Number },
      unit: { 
        type: String, 
        enum: ['sqft', 'sqmt'],
        default: 'sqft'
      }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Custom validator for images array limit
function arrayLimit(val) {
  return val.length <= 5;
}

// Indexes for better query performance
propertySchema.index({ 'propertyAddress.city': 1 });
propertySchema.index({ 'price.amount': 1 });
propertySchema.index({ 'propertyAddress.state': 1 });
propertySchema.index({ 'createdBy': 1 });
propertySchema.index({ 'price.priceType': 1 });

module.exports = mongoose.model('Property', propertySchema);
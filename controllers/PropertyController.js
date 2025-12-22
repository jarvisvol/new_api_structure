const Property = require('../models/Property');
const mongoose = require('mongoose');
const BaseController = require('./BaseController');
require('dotenv').config();

class PropertyController extends BaseController {
  constructor() {
    super();
  }

  // 1. CREATE - Add new property
  async createProperty(req, res) {
    try {
      const {
        propertyAddress,
        price,
        distanceFromTransport,
        images,
        dimensions
      } = req.body;

      console.log('🏠 Creating new property for user:', req.user?.user_id);

      // Basic validation
      if (!propertyAddress || !price || !distanceFromTransport || !dimensions) {
        return res.status(400).send(this.responseFailed('Required fields are missing'));
      }

      // Validate property address has required fields
      if (!propertyAddress.streetAddress || !propertyAddress.city || 
          !propertyAddress.state || !propertyAddress.zipCode) {
        return res.status(400).send(this.responseFailed('Property address is incomplete'));
      }

      // Validate price
      if (!price.amount || !price.priceType) {
        return res.status(400).send(this.responseFailed('Price information is incomplete'));
      }

      // Validate distance from transport
      if (!distanceFromTransport.railwayStation || !distanceFromTransport.busStand) {
        return res.status(400).send(this.responseFailed('Transport distance information is incomplete'));
      }

      // Validate railway station
      if (!distanceFromTransport.railwayStation.distance || 
          !distanceFromTransport.railwayStation.nearestStationName) {
        return res.status(400).send(this.responseFailed('Railway station information is incomplete'));
      }

      // Validate bus stand
      if (!distanceFromTransport.busStand.distance || 
          !distanceFromTransport.busStand.nearestBusStandName) {
        return res.status(400).send(this.responseFailed('Bus stand information is incomplete'));
      }

      // Validate dimensions
      if (!dimensions.plotArea || !dimensions.plotArea.value) {
        return res.status(400).send(this.responseFailed('Plot area information is required'));
      }

      // Validate images (max 5)
      if (images && images.length > 5) {
        return res.status(400).send(this.responseFailed('Maximum 5 images allowed'));
      }

      // Create property with user info
      const propertyData = {
        ...req.body,
        createdBy: req.user?.user_id,
        lastUpdatedBy: req.user?.user_id
      };

      const property = await Property.create(propertyData);

      console.log('✅ Property created successfully:', property._id);

      return res.status(201).send(this.responseSuccess('Property created successfully', {
        propertyId: property._id,
        address: property.propertyAddress,
        price: property.price,
        message: 'Property listed successfully'
      }));
    } catch (err) {
      console.error('❌ Create property error:', err);

      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      // Handle duplicate key error
      if (err.code === 11000) {
        return res.status(400).send(this.responseFailed('Property already exists'));
      }

      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 2. READ - Get single property by ID
  async getPropertyById(req, res) {
    try {
      const { id } = req.params;

      console.log('🔍 Getting property by ID:', id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid property ID'));
      }

      const property = await Property.findById(id)
        .populate('createdBy', 'name email phoneNumber')
        .populate('lastUpdatedBy', 'name email phoneNumber');

      if (!property) {
        return res.status(404).send(this.responseFailed('Property not found'));
      }

      console.log('✅ Property found:', property._id);

      return res.status(200).send(this.responseSuccess('Property retrieved successfully', property));
    } catch (err) {
      console.error('❌ Get property error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 3. UPDATE - Update property
  async updateProperty(req, res) {
    try {
      const { id } = req.params;

      console.log('✏️ Updating property:', id, 'by user:', req.user?.user_id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid property ID'));
      }

      const property = await Property.findById(id);

      if (!property) {
        return res.status(404).send(this.responseFailed('Property not found'));
      }

      // Check if user is authorized to update (owner or admin)
      if (property.createdBy.toString() !== req.user?.user_id && req.user?.role !== 'admin') {
        return res.status(403).send(this.responseFailed('Not authorized to update this property'));
      }

      // Update property data
      Object.assign(property, req.body);
      property.lastUpdatedBy = req.user?.user_id;
      property.updatedAt = Date.now();

      await property.save();

      console.log('✅ Property updated successfully:', property._id);

      return res.status(200).send(this.responseSuccess('Property updated successfully', property));
    } catch (err) {
      console.error('❌ Update property error:', err);

      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 4. DELETE - Delete property
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;

      console.log('🗑️ Deleting property:', id, 'by user:', req.user?.user_id);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid property ID'));
      }

      const property = await Property.findById(id);

      if (!property) {
        return res.status(404).send(this.responseFailed('Property not found'));
      }

      // Check if user is authorized to delete (owner or admin)
      if (property.createdBy.toString() !== req.user?.user_id && req.user?.role !== 'admin') {
        return res.status(403).send(this.responseFailed('Not authorized to delete this property'));
      }

      await Property.findByIdAndDelete(id);

      console.log('✅ Property deleted successfully:', id);

      return res.status(200).send(this.responseSuccess('Property deleted successfully'));
    } catch (err) {
      console.error('❌ Delete property error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 5. LIST - Get all properties with pagination & filters
  async getAllProperties(req, res) {
    try {
      console.log('📋 Getting all properties with filters');

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || process.env.PAGINATION_LIMIT || 10;
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};

      // City filter
      if (req.query.city) {
        filter['propertyAddress.city'] = {
          $regex: req.query.city,
          $options: 'i'
        };
      }

      // State filter
      if (req.query.state) {
        filter['propertyAddress.state'] = {
          $regex: req.query.state,
          $options: 'i'
        };
      }

      // Price range filter
      if (req.query.minPrice || req.query.maxPrice) {
        filter['price.amount'] = {};
        if (req.query.minPrice) {
          filter['price.amount'].$gte = parseFloat(req.query.minPrice);
        }
        if (req.query.maxPrice) {
          filter['price.amount'].$lte = parseFloat(req.query.maxPrice);
        }
      }

      // Price type filter
      if (req.query.priceType) {
        filter['price.priceType'] = req.query.priceType;
      }

      // Plot area filter
      if (req.query.minPlotArea || req.query.maxPlotArea) {
        filter['dimensions.plotArea.value'] = {};
        if (req.query.minPlotArea) {
          filter['dimensions.plotArea.value'].$gte = parseFloat(req.query.minPlotArea);
        }
        if (req.query.maxPlotArea) {
          filter['dimensions.plotArea.value'].$lte = parseFloat(req.query.maxPlotArea);
        }
      }

      // Distance from railway filter
      if (req.query.maxRailwayDistance) {
        filter['distanceFromTransport.railwayStation.distance'] = {
          $lte: parseFloat(req.query.maxRailwayDistance)
        };
      }

      // Distance from bus stand filter
      if (req.query.maxBusDistance) {
        filter['distanceFromTransport.busStand.distance'] = {
          $lte: parseFloat(req.query.maxBusDistance)
        };
      }

      // Text search
      if (req.query.search) {
        filter.$or = [
          { 'propertyAddress.streetAddress': { $regex: req.query.search, $options: 'i' } },
          { 'propertyAddress.city': { $regex: req.query.search, $options: 'i' } },
          { 'distanceFromTransport.railwayStation.nearestStationName': { $regex: req.query.search, $options: 'i' } },
          { 'distanceFromTransport.busStand.nearestBusStandName': { $regex: req.query.search, $options: 'i' } }
        ];
      }

      // Sort options
      let sort = { createdAt: -1 };
      if (req.query.sortBy) {
        const sortField = req.query.sortBy;
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        const sortMap = {
          'price': 'price.amount',
          'plotArea': 'dimensions.plotArea.value',
          'railwayDistance': 'distanceFromTransport.railwayStation.distance',
          'busDistance': 'distanceFromTransport.busStand.distance',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };

        if (sortMap[sortField]) {
          sort = { [sortMap[sortField]]: sortOrder };
        }
      }

      // Execute query
      const properties = await Property.find(filter)
        .populate('createdBy', 'name email phoneNumber')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Property.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);

      console.log('✅ Properties retrieved:', properties.length);

      return res.status(200).send(this.responseSuccess('Properties retrieved successfully', {
        count: properties.length,
        total,
        totalPages,
        currentPage: page,
        limit,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get all properties error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 6. SEARCH - Advanced property search
  async searchProperties(req, res) {
    try {
      console.log('🔎 Advanced property search');

      const {
        location,
        minPrice,
        maxPrice,
        minPlotArea,
        maxPlotArea,
        railwayMaxDistance,
        busMaxDistance,
        priceType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};

      // Location search
      if (location) {
        filter.$or = [
          { 'propertyAddress.city': { $regex: location, $options: 'i' } },
          { 'propertyAddress.state': { $regex: location, $options: 'i' } },
          { 'propertyAddress.streetAddress': { $regex: location, $options: 'i' } }
        ];
      }

      // Price filter
      if (minPrice || maxPrice) {
        filter['price.amount'] = {};
        if (minPrice) filter['price.amount'].$gte = Number(minPrice);
        if (maxPrice) filter['price.amount'].$lte = Number(maxPrice);
      }

      // Plot area filter
      if (minPlotArea || maxPlotArea) {
        filter['dimensions.plotArea.value'] = {};
        if (minPlotArea) filter['dimensions.plotArea.value'].$gte = Number(minPlotArea);
        if (maxPlotArea) filter['dimensions.plotArea.value'].$lte = Number(maxPlotArea);
      }

      // Railway distance filter
      if (railwayMaxDistance) {
        filter['distanceFromTransport.railwayStation.distance'] = {
          $lte: Number(railwayMaxDistance)
        };
      }

      // Bus distance filter
      if (busMaxDistance) {
        filter['distanceFromTransport.busStand.distance'] = {
          $lte: Number(busMaxDistance)
        };
      }

      // Price type filter
      if (priceType) {
        filter['price.priceType'] = priceType;
      }

      // Sort options
      const sortOptions = {
        'price': { 'price.amount': sortOrder === 'asc' ? 1 : -1 },
        'plotArea': { 'dimensions.plotArea.value': sortOrder === 'asc' ? 1 : -1 },
        'railwayDistance': { 'distanceFromTransport.railwayStation.distance': sortOrder === 'asc' ? 1 : -1 },
        'busDistance': { 'distanceFromTransport.busStand.distance': sortOrder === 'asc' ? 1 : -1 },
        'createdAt': { 'createdAt': sortOrder === 'asc' ? 1 : -1 },
        'updatedAt': { 'updatedAt': sortOrder === 'asc' ? 1 : -1 }
      };

      const sort = sortOptions[sortBy] || { 'createdAt': -1 };

      const properties = await Property.find(filter)
        .populate('createdBy', 'name email phoneNumber')
        .sort(sort)
        .limit(20);

      console.log('✅ Search results:', properties.length);

      return res.status(200).send(this.responseSuccess('Search completed successfully', {
        count: properties.length,
        filters: req.query,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Search properties error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 7. GET - Properties by city
  async getPropertiesByCity(req, res) {
    try {
      const { city } = req.params;

      console.log('🏙️ Getting properties by city:', city);

      if (!city) {
        return res.status(400).send(this.responseFailed('City parameter is required'));
      }

      const properties = await Property.find({
        'propertyAddress.city': { $regex: city, $options: 'i' }
      })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'price.amount': 1 });

      console.log('✅ Found properties:', properties.length, 'in', city);

      return res.status(200).send(this.responseSuccess(`Properties in ${city}`, {
        count: properties.length,
        city,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get properties by city error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 8. GET - Properties within price range
  async getPropertiesByPriceRange(req, res) {
    try {
      const { min, max } = req.params;

      console.log('💰 Getting properties in price range:', min, '-', max);

      if (!min || !max) {
        return res.status(400).send(this.responseFailed('Both min and max price are required'));
      }

      const minPrice = parseFloat(min);
      const maxPrice = parseFloat(max);

      if (isNaN(minPrice) || isNaN(maxPrice)) {
        return res.status(400).send(this.responseFailed('Invalid price values'));
      }

      if (minPrice > maxPrice) {
        return res.status(400).send(this.responseFailed('Min price cannot be greater than max price'));
      }

      const properties = await Property.find({
        'price.amount': { $gte: minPrice, $lte: maxPrice }
      })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'price.amount': 1 });

      console.log('✅ Found properties:', properties.length, 'in price range');

      return res.status(200).send(this.responseSuccess('Properties in price range', {
        count: properties.length,
        priceRange: `${min} - ${max}`,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get properties by price range error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 9. GET - Properties near railway station
  async getPropertiesNearRailway(req, res) {
    try {
      const { distance } = req.params;
      const { station } = req.query;

      console.log('🚉 Getting properties near railway:', distance, 'km', station ? `station: ${station}` : '');

      if (!distance) {
        return res.status(400).send(this.responseFailed('Distance parameter is required'));
      }

      const maxDistance = parseFloat(distance);

      if (isNaN(maxDistance)) {
        return res.status(400).send(this.responseFailed('Invalid distance value'));
      }

      let filter = {
        'distanceFromTransport.railwayStation.distance': { $lte: maxDistance }
      };

      if (station) {
        filter['distanceFromTransport.railwayStation.nearestStationName'] = {
          $regex: station, $options: 'i'
        };
      }

      const properties = await Property.find(filter)
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'distanceFromTransport.railwayStation.distance': 1 });

      console.log('✅ Found properties:', properties.length, 'near railway');

      return res.status(200).send(this.responseSuccess('Properties near railway station', {
        count: properties.length,
        maxDistance,
        station: station || 'any',
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get properties near railway error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 10. GET - Statistics and analytics
  async getPropertyStats(req, res) {
    try {
      console.log('📊 Getting property statistics');

      const stats = await Property.aggregate([
        {
          $group: {
            _id: '$price.priceType',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price.amount' },
            minPrice: { $min: '$price.amount' },
            maxPrice: { $max: '$price.amount' },
            avgPlotArea: { $avg: '$dimensions.plotArea.value' }
          }
        },
        {
          $group: {
            _id: null,
            totalProperties: { $sum: '$count' },
            priceTypes: { $push: '$$ROOT' },
            overallAvgPrice: { $avg: '$avgPrice' }
          }
        },
        {
          $project: {
            _id: 0,
            totalProperties: 1,
            overallAvgPrice: 1,
            priceTypes: 1
          }
        }
      ]);

      // City distribution
      const cityStats = await Property.aggregate([
        {
          $group: {
            _id: '$propertyAddress.city',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price.amount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Recent properties
      const recentProperties = await Property.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('createdBy', 'name email');

      console.log('✅ Statistics generated');

      return res.status(200).send(this.responseSuccess('Property statistics', {
        ...stats[0],
        cityDistribution: cityStats,
        recentProperties
      }));
    } catch (err) {
      console.error('❌ Get property stats error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 11. GET - User's own properties
  async getMyProperties(req, res) {
    try {
      const userId = req.user?.user_id;

      console.log('👤 Getting properties for user:', userId);

      if (!userId) {
        return res.status(401).send(this.responseFailed('User not authenticated'));
      }

      const properties = await Property.find({ createdBy: userId })
        .sort({ createdAt: -1 });

      console.log('✅ Found user properties:', properties.length);

      return res.status(200).send(this.responseSuccess('Your properties', {
        count: properties.length,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get my properties error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 12. GET - Properties by multiple cities
  async getPropertiesByMultipleCities(req, res) {
    try {
      const { cities } = req.query;

      console.log('🌆 Getting properties by multiple cities');

      if (!cities) {
        return res.status(400).send(this.responseFailed('Cities parameter is required'));
      }

      const cityArray = cities.split(',').map(city => city.trim());

      const properties = await Property.find({
        'propertyAddress.city': { $in: cityArray.map(city => new RegExp(city, 'i')) }
      })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'propertyAddress.city': 1, 'price.amount': 1 });

      console.log('✅ Found properties:', properties.length, 'in', cityArray.length, 'cities');

      return res.status(200).send(this.responseSuccess('Properties in multiple cities', {
        count: properties.length,
        cities: cityArray,
        data: properties
      }));
    } catch (err) {
      console.error('❌ Get properties by multiple cities error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }
}

module.exports = PropertyController;
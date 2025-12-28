const Property = require('../models/Property');
const mongoose = require('mongoose');
const BaseController = require('./BaseController');
require('dotenv').config();
const s3Client = require('../database/s3config');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');


class PropertyController extends BaseController {
  constructor() {
    super();
  }

  async getPresignedUrls(keys, contentType = 'image/jpeg') {
    const urls = [];

    for (const key of keys) {
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 300 // URL expires in 5 minutes
      });

      urls.push({
        key,
        url,
        contentType
      });
    }

    return urls;
  }

  // 1. CREATE - Add new property
  async createProperty(req, res) {
    try {
      const {
        streetAddress,
        city,
        state,
        zipCode,
        country,
        currency,
        amount,
        priceType,
        pricePerSquareUnit,
        plotArea,
        builtUpArea,
        nearestStationName,
        railwayDistance,
        nearestBusStandName,
        busDistance,
        createdBy,
        imageCount = 3 // Default to 3 images, can be overridden by frontend
      } = req.body;

      // Basic validation
      if (!streetAddress || !city || !state || !zipCode || !country ||
        !amount || !priceType || !plotArea || !nearestStationName ||
        !railwayDistance || !nearestBusStandName || !busDistance) {
        return res.status(400).send(this.responseFailed('Required fields are missing'));
      }

      // Validate numeric fields
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).send(this.responseFailed('Invalid price amount'));
      }

      if (isNaN(plotArea) || plotArea <= 0) {
        return res.status(400).send(this.responseFailed('Invalid plot area'));
      }

      if (isNaN(railwayDistance) || railwayDistance < 0) {
        return res.status(400).send(this.responseFailed('Invalid railway distance'));
      }

      if (isNaN(busDistance) || busDistance < 0) {
        return res.status(400).send(this.responseFailed('Invalid bus distance'));
      }

      // Validate price type
      if (!['sale', 'rent'].includes(priceType)) {
        return res.status(400).send(this.responseFailed('Invalid price type'));
      }

      // Process images from FormData (if any)
      // Structure the data according to your schema
      const structuredPropertyData = {
        propertyAddress: {
          streetAddress,
          city,
          state,
          zipCode,
          country
        },
        price: {
          amount: parseFloat(amount),
          currency: currency || 'INR',
          priceType,
          pricePerSquareUnit: pricePerSquareUnit ? parseFloat(pricePerSquareUnit) : undefined
        },
        distanceFromTransport: {
          railwayStation: {
            distance: parseFloat(railwayDistance),
            unit: 'km',
            nearestStationName
          },
          busStand: {
            distance: parseFloat(busDistance),
            unit: 'km',
            nearestBusStandName
          }
        },
        dimensions: {
          plotArea: {
            value: parseFloat(plotArea),
            unit: 'sqft'
          }
        },
        createdBy: req.user?.user_id || createdBy,
        lastUpdatedBy: req.user?.user_id || createdBy,
        images: [] // Initialize empty images array
      };

      // Add builtUpArea if provided
      if (builtUpArea && !isNaN(builtUpArea) && builtUpArea > 0) {
        structuredPropertyData.dimensions.builtUpArea = {
          value: parseFloat(builtUpArea),
          unit: 'sqft'
        };
      }

      // Create and save the new property
      const newProperty = await Property.create(structuredPropertyData);

      // Generate presigned URLs for multiple images (3-5 images)
      const numberOfImages = Math.min(Math.max(imageCount, 3), 5); // Ensure between 3-5
      const imageKeys = [];

      for (let i = 0; i < numberOfImages; i++) {
        // Generate unique key for each image
        const timestamp = Date.now();
        const imageKey = `properties/${newProperty._id}/image-${i + 1}-${timestamp}.jpeg`;
        imageKeys.push(imageKey);
      }

      // Get presigned URLs for all images
      const presignedUrls = await this.getPresignedUrls(imageKeys);

      // Generate public URLs for the images (for frontend to use after upload)
      const imageUrls = imageKeys.map(key => ({
        key,
        url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      }));

      return res.status(201).send(this.responseSuccess('Property created successfully', {
        propertyId: newProperty._id,
        address: `${newProperty.propertyAddress.streetAddress}, ${newProperty.propertyAddress.city}`,
        price: newProperty.price.amount,
        currency: newProperty.price.currency,
        presignedUrls, // Array of objects with key and presigned URL
        imageUrls, // Array of public URLs (will be accessible after upload)
        message: 'Property created. Upload images using the provided URLs.'
      }));
    } catch (err) {
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      if (err.code === 11000) {
        return res.status(400).send(this.responseFailed('Property already exists'));
      }
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // NEW METHOD: Update property with uploaded image URLs
  async updatePropertyImages(req, res) {
    try {
      const { propertyId } = req.params;
      const { images } = req.body; // Array of objects with { key, url }

      if (!propertyId || !images || !Array.isArray(images)) {
        return res.status(400).send(this.responseFailed('Property ID and images array are required'));
      }

      // Find the property
      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).send(this.responseFailed('Property not found'));
      }

      // Update property with image URLs
      property.images = images.map(img => ({
        key: img.key,
        url: img.url,
        uploadedAt: new Date()
      }));

      property.lastUpdatedBy = req.user?.user_id;
      property.updatedAt = new Date();

      await property.save();

      return res.status(200).send(this.responseSuccess('Images updated successfully', {
        propertyId,
        images: property.images,
        message: `${images.length} image(s) added to property`
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 3. UPDATE - Update property
  async updateProperty(req, res) {
    try {
      const { id } = req.params;
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
      return res.status(200).send(this.responseSuccess('Property updated successfully', property));
    } catch (err) {
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 2. READ - Get single property by ID
  async getPropertyById(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid property ID'));
      }

      const property = await Property.findById(id)
        .populate('createdBy', 'name email phoneNumber')
        .populate('lastUpdatedBy', 'name email phoneNumber');

      if (!property) {
        return res.status(404).send(this.responseFailed('Property not found'));
      }
      return res.status(200).send(this.responseSuccess('Property retrieved successfully', property));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 4. DELETE - Delete property
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;
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
      return res.status(200).send(this.responseSuccess('Property deleted successfully'));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 5. LIST - Get all properties with pagination & filters
  async getAllProperties(req, res) {
    try {
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
      return res.status(200).send(this.responseSuccess('Properties retrieved successfully', {
        count: properties.length,
        total,
        totalPages,
        currentPage: page,
        limit,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 6. SEARCH - Advanced property search
  async searchProperties(req, res) {
    try {
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

      return res.status(200).send(this.responseSuccess('Search completed successfully', {
        count: properties.length,
        filters: req.query,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 7. GET - Properties by city
  async getPropertiesByCity(req, res) {
    try {
      const { city } = req.params;
      if (!city) {
        return res.status(400).send(this.responseFailed('City parameter is required'));
      }

      const properties = await Property.find({
        'propertyAddress.city': { $regex: city, $options: 'i' }
      })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'price.amount': 1 });
      return res.status(200).send(this.responseSuccess(`Properties in ${city}`, {
        count: properties.length,
        city,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 8. GET - Properties within price range
  async getPropertiesByPriceRange(req, res) {
    try {
      const { min, max } = req.params;
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
      return res.status(200).send(this.responseSuccess('Properties in price range', {
        count: properties.length,
        priceRange: `${min} - ${max}`,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 9. GET - Properties near railway station
  async getPropertiesNearRailway(req, res) {
    try {
      const { distance } = req.params;
      const { station } = req.query;
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
      return res.status(200).send(this.responseSuccess('Properties near railway station', {
        count: properties.length,
        maxDistance,
        station: station || 'any',
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 10. GET - Statistics and analytics
  async getPropertyStats(req, res) {
    try {
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
      return res.status(200).send(this.responseSuccess('Property statistics', {
        ...stats[0],
        cityDistribution: cityStats,
        recentProperties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 11. GET - User's own properties
  async getMyProperties(req, res) {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).send(this.responseFailed('User not authenticated'));
      }

      const properties = await Property.find({ createdBy: userId })
        .sort({ createdAt: -1 });
      return res.status(200).send(this.responseSuccess('Your properties', {
        count: properties.length,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // 12. GET - Properties by multiple cities
  async getPropertiesByMultipleCities(req, res) {
    try {
      const { cities } = req.query;
      if (!cities) {
        return res.status(400).send(this.responseFailed('Cities parameter is required'));
      }

      const cityArray = cities.split(',').map(city => city.trim());

      const properties = await Property.find({
        'propertyAddress.city': { $in: cityArray.map(city => new RegExp(city, 'i')) }
      })
        .populate('createdBy', 'name email phoneNumber')
        .sort({ 'propertyAddress.city': 1, 'price.amount': 1 });
      return res.status(200).send(this.responseSuccess('Properties in multiple cities', {
        count: properties.length,
        cities: cityArray,
        data: properties
      }));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }
}

module.exports = PropertyController;
// controllers/clientContactController.js
const ClientContact = require('../models/ClientContact');
const validator = require('validator');

class ClientContactController {
  /**
   * Helper method for failed responses
   */
  responseFailed(message) {
    return {
      status: 'failed',
      message: message
    };
  }

  /**
   * Register new client contact
   * POST /api/client-contacts
   */
  async registerContact(req, res) {
    try {
      const { name, email, phoneNumber, message } = req.body;

      // Basic validation
      if (!name || !email || !phoneNumber || !message) {
        return res.status(400).send({
          status: 'failed',
          message: 'All fields are required: name, email, phone number, and message'
        });
      }

      // Validate email format
      if (!validator.isEmail(email)) {
        return res.status(400).send(this.responseFailed('Please provide a valid email address'));
      }

      // Validate phone number (Indian format)
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        return res.status(400).send(this.responseFailed('Please provide a valid 10-digit Indian phone number'));
      }

      // Validate message length
      if (message.trim().length < 10) {
        return res.status(400).send(this.responseFailed('Message must be at least 10 characters long'));
      }

      // Check if same person has submitted too many requests recently (prevent spam)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentSubmissions = await ClientContact.countDocuments({
        $or: [
          { email: email.toLowerCase() },
          { phoneNumber }
        ],
        createdAt: { $gte: oneHourAgo }
      });

      if (recentSubmissions >= 3) {
        return res.status(429).send({
          status: 'failed',
          message: 'Too many requests. Please try again after some time.'
        });
      }

      // Create new contact
      const clientContact = new ClientContact({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim(),
        message: message.trim()
      });

      // Save to database
      await clientContact.save();

      return res.status(201).send({
        status: 'success',
        message: 'Thank you for contacting us! We will get back to you soon.',
        data: {
          contactId: clientContact._id,
          name: clientContact.name,
          email: clientContact.email,
          submittedAt: clientContact.createdAt
        }
      });

    } catch (error) {
      console.error('Error registering client contact:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).send(this.responseFailed('Duplicate entry detected'));
      }

      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Get all client contacts with date filtering (Admin only)
   * GET /api/client-contacts
   */
  async getAllContacts(req, res) {
    try {
      // Get query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || parseInt(process.env.RECORDS_PER_PAGE) || 20;
      const skip = (page - 1) * limit;
      
      // Date filtering parameters (required)
      const startDate = req.query.startDate; // Format: YYYY-MM-DD (required)
      const endDate = req.query.endDate;     // Format: YYYY-MM-DD (required)
      
      if (!startDate || !endDate) {
        return res.status(400).send({
          status: 'failed',
          message: 'Both startDate and endDate parameters are required (format: YYYY-MM-DD)'
        });
      }

      // Validate date format
      const isValidDate = (dateString) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
      };

      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        return res.status(400).send({
          status: 'failed',
          message: 'Invalid date format. Use YYYY-MM-DD format'
        });
      }

      // Additional filters (optional)
      const status = req.query.status;
      const isRead = req.query.isRead;
      const search = req.query.search;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      // Build date filter
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Validate date range (max 30 days for performance)
      const maxDays = 30;
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > maxDays) {
        return res.status(400).send({
          status: 'failed',
          message: `Date range cannot exceed ${maxDays} days. Please specify a smaller range.`
        });
      }

      // Build filter object
      const filter = {
        createdAt: {
          $gte: start,
          $lte: end
        }
      };

      // Apply additional filters if provided
      if (status) {
        filter.status = status;
      }
      
      if (isRead !== undefined) {
        filter.isRead = isRead === 'true';
      }
      
      // Search filter (search in name, email, phone, or message)
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
          { message: searchRegex }
        ];
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      // Execute queries
      const [contacts, total] = await Promise.all([
        ClientContact.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        ClientContact.countDocuments(filter)
      ]);

      // Calculate totals by status for the date range
      const statusCounts = await ClientContact.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end
            }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Format status counts
      const statusStats = {};
      statusCounts.forEach(stat => {
        statusStats[stat._id] = stat.count;
      });

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).send({
        status: 'success',
        message: 'Contacts retrieved successfully',
        data: {
          contacts,
          pagination: {
            total,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
            nextPage: hasNextPage ? page + 1 : null,
            prevPage: hasPrevPage ? page - 1 : null
          },
          dateRange: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            days: daysDiff + 1
          },
          stats: {
            status: statusStats,
            unread: await ClientContact.countDocuments({ ...filter, isRead: false }),
            new: await ClientContact.countDocuments({ ...filter, status: 'new' })
          }
        }
      });

    } catch (error) {
      console.error('Error fetching contacts:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Get contact statistics (Admin only)
   * GET /api/client-contacts/stats
   */
  async getContactStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // Default to last 7 days if no dates provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const stats = await ClientContact.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 },
            new: {
              $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return res.status(200).send({
        status: 'success',
        message: 'Statistics retrieved successfully',
        data: {
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          dailyStats: stats,
          total: stats.reduce((sum, day) => sum + day.count, 0)
        }
      });

    } catch (error) {
      console.error('Error fetching contact stats:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }
}

module.exports = ClientContactController;
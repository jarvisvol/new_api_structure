const User = require('../models/User');
const UserToken = require('../models/UserToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BaseController = require('./BaseController');
const MailSender = require('../mailer/mail');
const mongoose = require('mongoose');
require('dotenv').config();

class UserController extends BaseController {
  constructor() {
    super();
    this.MailSender = new MailSender();
  }

  async registerUser(req, res) {
    try {
      const { name, email, phoneNumber, password, address, isVerified, landType, role_type } = req.body;

      // Basic validation
      if (!name || !email || !phoneNumber || !password || !address || !landType) {
        return res.status(400).send(this.responseFailed('All fields are required'));
      }

      // Validate address has city
      if (!address.city) {
        return res.status(400).send(this.responseFailed('City is required in address'));
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }]
      });

      if (existingUser) {
        return res.status(400).send(this.responseFailed('User already exists with this email or phone number'));
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Create user
      const user = await User.create({
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        address,
        landType,
        otp,
        otpExpires,
        otpVerified: isVerified ? true : false,
        isVerified: isVerified ? true : false,
        isActive: true,
        role: (role_type && ['user', 'admin', 'agent'].includes(role_type)) ? role_type : 'user'
      });


      // Send OTP email
      this.MailSender.mailToSomeone(email, otp);

      return res.status(201).send(this.responseSuccess('Registration successful. Please verify OTP.', {
        userId: user._id,
        email: user.email,
        name: user.name,
        message: 'OTP sent to your email',
      }));
    } catch (err) {

      // Handle validation errors
      if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(error => error.message);
        return res.status(400).send(this.responseFailed(errors.join(', ')));
      }

      // Handle duplicate key error
      if (err.code === 11000) {
        const field = err.message.includes('email') ? 'Email' : 'Phone number';
        return res.status(400).send(this.responseFailed(`${field} already exists`));
      }

      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log('🔑 Login attempt for:', email);

      // Find user with password selected
      const user = await User.findOne({ email }).select('+password +otpVerified +isActive');

      if (!user) {
        console.log('❌ User not found');
        return res.status(400).send(this.responseFailed('Invalid email or password'));
      }

      console.log('👤 User found:', user.email);
      console.log('User active?', user.isActive);
      console.log('OTP verified?', user.otpVerified);

      // Check if user is active
      if (!user.isActive) {
        return res.status(400).send(this.responseFailed('Account is deactivated'));
      }

      // Check OTP verification
      if (!user.otpVerified) {
        return res.status(400).send(this.responseFailed('Please verify your email using OTP first'));
      }

      // Compare password using bcrypt
      console.log('🔐 Comparing password...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid?', isPasswordValid);

      if (isPasswordValid) {
        // Generate JWT token
        const token = jwt.sign(
          {
            userId: user._id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          process.env.JWT_TOKEN_KEY,
          { expiresIn: '7d' }
        );

        console.log('✅ Token generated');

        // 1. Save token to User model
        user.accessToken = token;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });
        console.log('✅ Token saved to User model');

        // 2. Save token to UserToken collection
        try {
          // Check if user already has a token
          const existingToken = await UserToken.findOne({ user: user._id });

          if (existingToken) {
            // Update existing token
            existingToken.accessToken = token;
            await existingToken.save();
            console.log('✅ Updated existing token in UserToken collection');
          } else {
            // Create new token
            await UserToken.create({
              user: user._id,
              accessToken: token
            });
            console.log('✅ Created new token in UserToken collection');
          }
        } catch (tokenError) {
          console.error('⚠️ Error saving to UserToken collection:', tokenError.message);
          // Continue even if UserToken save fails
        }

        console.log('✅ Login successful');

        return res.status(200).send(this.responseSuccess('Login successful', {
          access_token: token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            address: user.address,
            landType: user.landType,
            role: user.role
          }
        }));
      } else {
        console.log('❌ Invalid password');
        return res.status(400).send(this.responseFailed('Invalid credentials'));
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  async checkToken(token) {
    try {
      if (!token) return null;

      console.log('🔍 Checking token...');

      // First, try to find in UserToken collection
      const userToken = await UserToken.findOne({ accessToken: token })
        .populate('user', 'name email phoneNumber role');

      if (userToken && userToken.user) {
        console.log('✅ Token found in UserToken collection');
        return {
          name: userToken.user.name,
          email: userToken.user.email,
          user_id: userToken.user._id,
          phoneNumber: userToken.user.phoneNumber,
          role: userToken.user.role
        };
      }

      // If not found in UserToken, try to verify JWT and find in User model
      console.log('⚠️ Token not found in UserToken, checking User model...');
      const decoded = jwt.verify(token, process.env.JWT_TOKEN_KEY);

      const user = await User.findOne({
        _id: decoded.userId,
        accessToken: token,
        isActive: true
      });

      if (user) {
        console.log('✅ Token found in User model');
        return {
          name: user.name,
          email: user.email,
          user_id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role
        };
      }

      console.log('❌ Token not found in any collection');
      return null;

    } catch (err) {
      console.error('❌ Check token error:', err.message);
      return null;
    }
  }

  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      console.log('🚪 Logout attempt for token');

      // 1. Remove token from User model
      const decoded = jwt.verify(token, process.env.JWT_TOKEN_KEY);
      await User.findByIdAndUpdate(decoded.userId, {
        accessToken: null
      });

      // 2. Remove token from UserToken collection
      await UserToken.deleteOne({ accessToken: token });

      console.log('✅ Logout successful');

      return res.status(200).send(this.responseSuccess('Logged out successfully'));
    } catch (err) {
      console.error('❌ Logout error:', err);
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).send(this.responseFailed('Invalid token'));
      }
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  async userDetail(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      console.log('🔍 Getting user details for token');

      const userData = await this.checkToken(token);

      if (!userData) {
        return res.status(401).send(this.responseFailed('Invalid or expired token'));
      }

      // Get full user details
      const user = await User.findById(userData.user_id);

      if (!user) {
        return res.status(404).send(this.responseFailed('User not found'));
      }

      console.log('✅ User details retrieved');

      return res.status(200).send(this.responseSuccess('User details retrieved successfully', user));
    } catch (err) {
      console.error('❌ User detail error:', err);
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // Update other methods to use checkToken
  async getUserProfile(req, res) {
    try {
      const { id } = req.params
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).send(this.responseFailed('User not found'));
      }

      return res.status(200).send(this.responseSuccess('Profile retrieved successfully', user));
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // Authentication middleware
  async authenticate(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      const userData = await this.checkToken(token);

      if (!userData) {
        return res.status(401).send(this.responseFailed('Invalid or expired token'));
      }

      req.user = userData;
      next();
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // Admin and Agent authentication middleware
  async authenticateAdminAgent(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      const userData = await this.checkToken(token);

      if (!userData) {
        return res.status(401).send(this.responseFailed('Invalid or expired token'));
      }

      // Check if user has admin or agent role
      if (!['admin', 'agent'].includes(userData.role)) {
        return res.status(403).send(this.responseFailed('Access denied. Admin or Agent privileges required'));
      }

      req.user = userData;
      next();
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  /**
   * Fetch all users with pagination (Admin only)
   * GET /api/users
   */
  async getAllUsers(req, res) {
    try {
      // Get query parameters with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || parseInt(process.env.RECORDS_PER_PAGE) || 10;
      const search = req.query.search || '';
      const role = req.query.role || '';
      const isActive = req.query.isActive;
      const isVerified = req.query.isVerified;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Build filter object
      const filter = {};

      // Search filter
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } },
          { 'address.state': { $regex: search, $options: 'i' } }
        ];
      }

      // Role filter
      if (role) {
        filter.role = role;
      }

      // Boolean filters
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }

      if (isVerified !== undefined) {
        filter.isVerified = isVerified === 'true';
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder;

      // Execute queries
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -otp -otpExpires -passcode -accessToken -__v')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).send({
        status: 'success',
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            total,
            totalPages,
            currentPage: page,
            limit,
            hasNextPage,
            hasPrevPage,
            nextPage: hasNextPage ? page + 1 : null,
            prevPage: hasPrevPage ? page - 1 : null
          }
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Alternative simplified pagination method
   */
  async getAllUsersSimple(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || parseInt(process.env.RECORDS_PER_PAGE) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find({})
        .select('-password -otp -otpExpires -passcode -accessToken -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await User.countDocuments();

      return res.status(200).send({
        status: 'success',
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
          }
        }
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid user ID'));
      }

      const user = await User.findById(id)
        .select('-password -otp -otpExpires -passcode -accessToken -__v');

      if (!user) {
        return res.status(404).send(this.responseFailed('User not found'));
      }

      return res.status(200).send({
        status: 'success',
        message: 'User retrieved successfully',
        data: user
      });

    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Update user status (Admin only)
   */
  async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).send(this.responseFailed('isActive must be a boolean'));
      }

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid user ID'));
      }

      const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true, runValidators: true }
      ).select('-password -otp -otpExpires -passcode -accessToken -__v');

      if (!user) {
        return res.status(404).send(this.responseFailed('User not found'));
      }

      const statusText = isActive ? 'activated' : 'deactivated';
      return res.status(200).send({
        status: 'success',
        message: `User ${statusText} successfully`,
        data: user
      });

    } catch (error) {
      console.error('Error updating user status:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['user', 'agent', 'admin'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).send(
          this.responseFailed(`Role must be one of: ${validRoles.join(', ')}`)
        );
      }

      // Validate ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send(this.responseFailed('Invalid user ID'));
      }

      // Prevent admin from removing their own admin role
      if (req.user.user_id.toString() === id && role !== 'admin') {
        return res.status(400).send(
          this.responseFailed('You cannot remove admin role from yourself')
        );
      }

      const user = await User.findByIdAndUpdate(
        id,
        { role },
        { new: true, runValidators: true }
      ).select('-password -otp -otpExpires -passcode -accessToken -__v');

      if (!user) {
        return res.status(404).send(this.responseFailed('User not found'));
      }

      return res.status(200).send({
        status: 'success',
        message: `User role updated to ${role} successfully`,
        data: user
      });

    } catch (error) {
      console.error('Error updating user role:', error);
      return res.status(500).send(this.responseFailed('Internal server error'));
    }
  }

  // Admin only authentication middleware
  async authenticateAdminOnly(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      const userData = await this.checkToken(token);

      if (!userData) {
        return res.status(401).send(this.responseFailed('Invalid or expired token'));
      }

      // Check if user has admin role only
      if (userData.role !== 'admin') {
        return res.status(403).send(this.responseFailed('Access denied. Admin privileges required'));
      }

      req.user = userData;
      next();
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }

  // Agent only authentication middleware
  async authenticateAgentOnly(req, res, next) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') ||
        req.headers.accesstoken;

      if (!token) {
        return res.status(401).send(this.responseFailed('Access token required'));
      }

      const userData = await this.checkToken(token);

      if (!userData) {
        return res.status(401).send(this.responseFailed('Invalid or expired token'));
      }

      // Check if user has agent role only
      if (userData.role !== 'agent') {
        return res.status(403).send(this.responseFailed('Access denied. Agent privileges required'));
      }

      req.user = userData;
      next();
    } catch (err) {
      return res.status(500).send(this.responseFailed('Internal Server Error'));
    }
  }
}

module.exports = UserController;
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const PropertyController = require('../controllers/PropertyController');
const upload = require('../middleware/uploadMiddleware');

// Create instances
const userController = new UserController();
const propertyController = new PropertyController();

// Apply .bind() to ALL controller methods
router.get('/properties',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.getAllProperties.bind(propertyController)
);

router.post('/properties',
  upload.array('images', 1),
  userController.authenticateAdminAgent.bind(userController),
  propertyController.createProperty.bind(propertyController) // Fixed: added .bind()
);

router.put('/properties/:id',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.updateProperty.bind(propertyController)
);

router.delete('/properties/:id',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.deleteProperty.bind(propertyController)
);

// Get presigned URLs for property - THIS NEEDS TO BE A CONTROLLER METHOD
router.get('/properties/:propertyId/upload-urls',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.getPresignedUrls.bind(propertyController) // Changed method name
);

// Update property with image URLs
router.put('/properties/:propertyId/images',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.updatePropertyImages.bind(propertyController) // Fixed: added .bind()
);

// Other routes remain the same...
router.post('/users',
  (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.registerUser(req, res)
);

router.get('/user/:id',
  (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.getUserProfile(req, res)
);

router.put('/user/:id',
  (req, res, next) => userController.authenticateAdminOnly(req, res, next),
  (req, res) => userController.updateUserRole(req, res)
);

router.delete('/user/:id',
  (req, res, next) => userController.authenticateAdminOnly(req, res, next),
  (req, res) => userController.deleteUser(req, res)
);

router.get('/users',
  (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.getAllUsers(req, res)
);




module.exports = router;
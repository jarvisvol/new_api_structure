const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const PropertyController = require('../controllers/PropertyController');

const userController = new UserController();
const propertyController = new PropertyController();

// Public routes (no authentication required)
router.get('/', propertyController.getAllProperties.bind(propertyController));
router.get('/search', propertyController.searchProperties.bind(propertyController));
router.get('/stats', propertyController.getPropertyStats.bind(propertyController));
router.get('/city/:city', propertyController.getPropertiesByCity.bind(propertyController));
router.get('/cities', propertyController.getPropertiesByMultipleCities.bind(propertyController));
router.get('/price/:min/:max', propertyController.getPropertiesByPriceRange.bind(propertyController));
router.get('/near-railway/:distance', propertyController.getPropertiesNearRailway.bind(propertyController));
router.get('/:id', propertyController.getPropertyById.bind(propertyController));

// Protected routes (require authentication)
router.post('/', 
  userController.authenticate.bind(userController),
  propertyController.createProperty.bind(propertyController)
);

router.put('/:id', 
  userController.authenticate.bind(userController),
  propertyController.updateProperty.bind(propertyController)
);

router.delete('/:id', 
  userController.authenticate.bind(userController),
  propertyController.deleteProperty.bind(propertyController)
);

router.get('/my/properties', 
  userController.authenticate.bind(userController),
  propertyController.getMyProperties.bind(propertyController)
);

module.exports = router;
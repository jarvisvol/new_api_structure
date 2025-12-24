const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const PropertyController = require('../controllers/PropertyController');

const userController = new UserController();
const propertyController = new PropertyController();

router.post('/properties', 
  userController.authenticateAdminAgent.bind(userController),
  propertyController.createProperty.bind(propertyController)
);

router.put('/properties/:id', 
  userController.authenticateAdminAgent.bind(userController),
  propertyController.updateProperty.bind(propertyController)
);

router.delete('/properties/:id', 
  userController.authenticateAdminAgent.bind(userController),
  propertyController.deleteProperty.bind(propertyController)
);

module.exports = router;
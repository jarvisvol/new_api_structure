const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const PropertyController = require('../controllers/PropertyController');

const userController = new UserController();
const propertyController = new PropertyController();

router.get('/properties',
  userController.authenticateAdminAgent.bind(userController),
  propertyController.getAllProperties.bind(propertyController)
);

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

router.post('/users', (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.registerUser(req, res));

router.get('/user/:id', 
  (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.getUserProfile(req, res)
);

router.put('/user/:id', 
  (req, res, next) => userController.authenticateAdminOnly(req, res, next),
  (req, res) => userController.updateUserRole(req, res)
);

router.get('/users', 
  (req, res, next) => userController.authenticateAdminAgent(req, res, next),
  (req, res) => userController.getAllUsers(req, res)
);




module.exports = router;
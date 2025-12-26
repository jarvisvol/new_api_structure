// routes/clientContactRoutes.js
const express = require('express');
const router = express.Router();
const ClientContactController = require('../controllers/ClientContactController');
const UserController = require('../controllers/UserController');

const clientContactController = new ClientContactController();
const userController = new UserController();

// Public routes
router.post('/', clientContactController.registerContact.bind(clientContactController));

router.get('/',userController.authenticateAdminAgent.bind(userController), clientContactController.getAllContacts.bind(clientContactController));
router.get('/stats',userController.authenticateAdminAgent.bind(userController), clientContactController.getContactStats.bind(clientContactController));

module.exports = router;
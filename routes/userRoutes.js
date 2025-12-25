var express = require('express');
var router = express.Router();


var UserController = require('../controllers/UserController.js');

var user_controller = new UserController();


// Public routes
router.post('/login', (req, res) => user_controller.login(req, res));
router.post('/register', (req, res) => user_controller.registerUser(req, res));
router.post('/verify-otp', (req, res) => user_controller.verifyOtp(req, res));
router.post('/resend-otp', (req, res) => user_controller.resendOtp(req, res));

// Protected routes
router.post('/logout', user_controller.authenticate.bind(user_controller), (req, res) => user_controller.logout(req, res));
router.get('/profile',user_controller.authenticate.bind(user_controller), (req, res) => user_controller.userDetail(req, res));

module.exports = router;
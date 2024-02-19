var express = require('express');
var router = express.Router();
var LoginController = require('../controllers/LoginController.js');

var login_controller = new LoginController();


router.post('/login', function(req, res, next) {
    login_controller.login(req, res, next);
});

router.post('/register', function(req, res) {
    login_controller.registerUser(req, res);
});

module.exports = router;
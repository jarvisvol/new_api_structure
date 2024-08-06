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

router.get('/list', (req, res) => {
    login_controller.getUserList(req, res);
})

router.post('/set-pass-code', (req, res) => {
    login_controller.setPasscode(req, res);
}) 

router.post('/check-passcode', (req, res) => {
    login_controller.checkPasscode(req, res);
})

router.post('/check-otp', (req, res) => {
    login_controller.checkOtp(req, res);
})

router.post('/resend-otp', (req, res) => {
    login_controller.resendOtp(req, res);
})

router.get('/user-detail', (req, res) => {
    login_controller.userDetail(req, res);
})

module.exports = router;
var express = require('express');
var router = express.Router();
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './private_csv')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '_user_name' + Math.floor(Math.random(0,1), 100000) + '.csv')
    }
})


upload = multer({storage: storage})


var LoginController = require('../controllers/LoginController.js');
var CsvController = require('../controllers/CsvController.js');

var login_controller = new LoginController();
var csv_controller = new CsvController();


router.post('/login', function(req, res, next) {
    login_controller.login(req, res, next);
});

router.post('/register', function(req, res) {
    login_controller.registerUser(req, res);
});

router.get('/list', (req, res) => {
    login_controller.getUserList(req, res);
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

router.get('/check-token', async(req, res) => {
    var token = req.headers;
    token = token.accesstoken
    const result = await login_controller.checkToken(token);
    if(result[0]?.user_id){
        req.body = {
            ...req.body,
            userDetails: result[0]
        };
        res.status(200).send("token veryfied");
    } else {
        res.status(401).send("you are not authorized fro this request");
    }
})

router.post('/csv-upload', upload.single('csv'),  (req, res) => {
    csv_controller.csvFileupload(req, res);
});

module.exports = router;
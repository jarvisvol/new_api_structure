var express = require('express');
var router = express.Router();

var PaymentController = require('../controllers/paymentController');

var pay_controller = new PaymentController;


router.post('/order-create', (req, res) => {
    pay_controller.sampleFunction(req, res);
})

module.exports = router;
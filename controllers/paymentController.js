const BaseController = require("./BaseController");
const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: 'rzp_test_kiP0kAHLAXqZrK',
    key_secret: 'HxsPpKph3xixOtupnXq7gbmG',
  });

class PaymentController extends BaseController {
    
    async sampleFunction (req, res) {
        const respo = await instance.orders.create({
            "amount": 100,
            "currency": "INR",
            "receipt": "receipt#1",
            "partial_payment": false,
            "notes": {
              "key1": "value3",
              "key2": "value2"
            }
           })
        res.send(respo);
        res.end()
    }
}


module.exports = PaymentController
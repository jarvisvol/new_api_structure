var express = require('express');
var router = express.Router();
var PhasesController = require('../controllers/PhasesController');
var LoginController = require('../controllers/LoginController.js');

var phase_controller = new PhasesController();

var login_controller = new LoginController();

router.use(async(req, res, next) => {
    var token = req.headers;
    token = token.accesstoken
    const result = await login_controller.checkToken(token);
    if(result[0]?.user_id){
        req.body = {
            ...req.body,
            userDetails: result[0]
        };
        next()
    } else {
        res.status(401).send("you are not authorized fro this request")
    }
})


router.get('/list', (req, res) => {
    phase_controller.getPhasesList(req, res);
})

module.exports = router;

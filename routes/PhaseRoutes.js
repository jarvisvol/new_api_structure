var express = require('express');
var router = express.Router();
var PhasesController = require('../controllers/PhasesController')

var phase_controller = new PhasesController();


router.get('/list', (req, res) => {
    phase_controller.getPhasesList(req, res);
})

module.exports = router;

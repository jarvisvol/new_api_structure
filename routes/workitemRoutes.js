var express = require('express');
var router = express.Router();
var WorkItemController = require('../controllers/WorkItemController.js');
var LoginController = require('../controllers/LoginController.js');


var workitem_controller = new WorkItemController();
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

router.get('/list', function(req, res) {
  workitem_controller.getWorkItemList(req, res)
});

router.post('/create', function(req, res, next) {
    workitem_controller.createWorkItem(req, res)
});

router.put('/:workitemId', function(req, res) {
    workitem_controller.updateWorkItem(req, res)
});

router.delete('/:workitemId', function(req, res) {
    workitem_controller.deleteWorkItem(req, res)
});

module.exports = router;

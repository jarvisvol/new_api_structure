var express = require('express');
var router = express.Router();
var EmployeController = require('../controllers/EmployeController.js');

var employee_controller = new EmployeController();


router.post('/:accountId/add-employee', function(req, res, next) {
    employee_controller.createEmployee(req, res, next);
});

router.get('/:accountId/employee-list', function(req, res) {
    employee_controller.getEmployeeList(req, res);
});

router.put('/:accountId/:employeeId', function(req, res) {
    employee_controller.editEmployee(req, res);
});

router.delete('/:accountId/:employeeId', function(req, res) {
    employee_controller.deleteEmployee(req, res);
});

router.get('/:accountId/:employeeId', function(req, res) {
    employee_controller.getEmployeeById(req, res);
});


module.exports = router;
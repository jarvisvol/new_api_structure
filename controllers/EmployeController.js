const BaseController = require("./BaseController");
const dataBase = require('../database/config.js');
require('dotenv');
const messages = require("../public/messages/messages");


class EmployeController extends BaseController {

    async getEmployeeList(req, res) {
        try {
            var accountId = req.params.accountId
            var page = req.query.page;
            var offset = 0;
            if (page > 1) {
                offset = process.env.RECORD_PER_PAGE * page
            }
            const [result] = await dataBase.query(`
            SELECT id, name, phone_number, address, salary, age
            FROM employee_detail
            WHERE account_id = ?
            ORDER BY created_at
            LIMIT ? OFFSET ?
            `, [accountId, parseInt(process.env.RECORD_PER_PAGE), offset]);
            return res.status(200).send(this.responseSuccess(messages.employee.get_list, { data: result }));

        } catch (error) {
            return res.status(400).send(this.responseFailed('somthing went wrong'));
        }
    }

    async createEmployee(req, res) {
        try {
            const { name, age, phone_number, address, account_number, ifsc_code, salary } = req.body;
            var accountId = req.params.accountId;
            const result = await dataBase.query(`
                INSERT INTO employee_detail (account_id, name, age, phone_number, address, account_number, ifsc_code, salary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [accountId, name, age, phone_number, address, account_number, ifsc_code, salary]);

            return res.status(200).send(this.responseSuccess(messages.employee.create_employee, { data: result }));

        } catch (error) {
            return res.status(400).send(this.responseFailed('somthing went wrong'));
        }
    }

    async getEmployeeById(req, res) {
        try {
            var accountId = req.params.accountId;
            var employeeId = req.params.employeeId;
            const [result] = await dataBase.query(`
                SELECT *
                FROM employee_detail
                WHERE account_id = ? AND id = ?
            `, [accountId, employeeId]);
            return res.status(200).send(this.responseSuccess(messages.employee.get_one, { data: result }));
        } catch (error) {
            return res.status(400).send(this.responseFailed('somthing went wrong'));
        }
    }

    async editEmployee(req, res) {
        try {
            const { name, age, phone_number, address, account_number, ifsc_code, salary } = req.body;
            var accountId = req.params.accountId;
            var employeeId = req.params.employeeId;
            const result = await dataBase.query(`
                UPDATE employee_detail
                SET name = ?,
                    age = ?,
                    phone_number = ?,
                    address = ?,
                    account_number = ?,
                    ifsc_code = ?,
                    salary = ?
                WHERE account_id = ? AND id = ?
            `, [name, age, phone_number, address, account_number, ifsc_code, salary, accountId, employeeId]);

            return res.status(200).send(this.responseSuccess(messages.employee.update_employee, { data: result }));

        } catch (error) {
            return res.status(400).send(this.responseFailed('somthing went wrong'));
        }
    }


    async deleteEmployee(req, res) {
        try {
            var accountId = req.params.accountId;
            var employeeId = req.params.employeeId;
            var [result] = await dataBase.query(`
                DELETE
                FROM employee_detail
                WHERE account_id = ? AND id = ?
            `, [accountId, employeeId])
            return res.status(200).send(this.responseSuccess(messages.employee.delete_employe, { data: result }));
        } catch (error) {
            return res.status(400).send(this.responseFailed('somthing went wrong'));
        }
    }

}

module.exports = EmployeController;
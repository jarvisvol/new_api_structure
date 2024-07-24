const BaseController = require('./BaseController');
const dataBase = require("../database/config");


class WorkItem extends BaseController{
    constructor(){
        super()
    }

    async getWorkItemList(req, res){
        try {
            const user = req.body.userDetails;
            const [result] = await dataBase.query(`
                select *
                from workitem
                where user_id = ?
            `, [user.user_id])
            res.status(200).send(this.responseSuccess('work item gets successfully', result))
        } catch (error) {
            res.status(400).send(this.responseFailed('successfully  in',error))
        }
    }

    async createWorkItem(req, res){
        try {
            var user = req.body.userDetails;
            const {name, description} = req.body;
            const [result] = await dataBase.query(`
                insert into workitem (name, description, user_id)
                values (?, ?, ?)
            `, [name, description, user.user_id]
            )
            res.status(200).send(this.responseSuccess('n', result))
        } catch (error) {
            res.status(400).send(this.responseFailed('successfully  in',error))
        }
    }

    async updateWorkItem(req, res){
        try {
            var workitemId =  req.params.workitemId
            var {name, description} = req.body;
            const [result] = await dataBase.query(`
                update workitem
                set name = ?, description = ?
                where id = ?
            `, [name, description, workitemId])
            res.status(200).send(this.responseSuccess('n', result))
        } catch (error) {
            res.status(400).send(this.responseFailed('successfully  in',error))
        }
    }

    async deleteWorkItem(req, res){
        try {
            var workitemId =  req.params.workitemId 
            const result = dataBase.query(`
                delete
                from workitem
                where id = ?
            `, [workitemId])
            res.status(200).send(this.responseSuccess('n', result))
        } catch (error) {
            res.status(400).send(this.responseFailed('successfully  in',error))
        }
    }
}

module.exports = WorkItem;
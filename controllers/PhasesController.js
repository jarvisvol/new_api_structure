const dataBase = require("../database/config");
const BaseController = require("./BaseController");

class PhasesController extends BaseController{
    constructor(){
        super()
    }

    async getPhasesList(req, res){
        try {
            var user = req.body.userDetails;
            const [result] = await dataBase.query(`
                select *
                from workitem_phase
                `);
            res.status(200).send(this.responseSuccess('phases gets successfully', result));
        } catch (error) {
            res.status(400).send(this.responseFailed('something went wrong', error));
        }
    }
}

module.exports = PhasesController;
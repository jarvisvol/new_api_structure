const BaseController = require("./BaseController");
const fs = require('fs');
class CsvController extends BaseController {
    async csvFileupload(req, res) {
        res.status(200).send(this.responseSuccess('CSV Uploaded successfully'))
    }
}

module.exports = CsvController;
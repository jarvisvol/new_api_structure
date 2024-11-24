const BaseController = require("./BaseController");
const { spawn } = require('child_process');

const fs = require('fs');


class CsvController extends BaseController {
    async csvFileupload(req, res, fileName) {
        const python = spawn('python3',['../scripts/pythonScripts.py', 'csvDataInsigts', fileName]);
    

        // res.status(200).send(this.responseSuccess('CSV Uploaded successfully'))
    }
}

module.exports = CsvController;
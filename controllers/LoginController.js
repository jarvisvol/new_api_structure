const dataBase = require("../database/config");
var crypto = require('crypto');
require('dotenv').config();

class LoginController {

    constructor() {
        this.dataBase = dataBase;
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const [user_detail] = await dataBase.query("SELECT password FROM users WHERE email = ?", [email]);
            var user_password = user_detail[0].password
            /// decryption 
            var deKey = crypto.createDecipher(process.env.PASSWORD_ALGO, process.env.PASSWORD_KEY);
            var deCryptedPassword = deKey.update(user_password, 'hex', 'utf8');
            deCryptedPassword += deKey.final('utf-8');
            if(password === deCryptedPassword){
                res.status(200).send({ status: 200, messeage: 'Login SuccessFul', toke: '4236482587' });
            } else {
                res.status(400).send({ status: 400, messeage: 'invalid credentials'});
            }
            
        } catch (err) {
            res.status(500).send("Internal Server Error");
        }
    }

    async registerUser(req, res) {
        var userDetails = req.body;
        const {password} = req.body;
        var myKey = crypto.createCipher(process.env.PASSWORD_ALGO, process.env.PASSWORD_KEY);
        var encryptedPassword = myKey.update(password, 'utf8', 'hex');
        encryptedPassword += myKey.final('hex');
        const user_insert = await dataBase.query('INSERT INTO users (email, phone_number , password) VALUES(?, ? ,?)', [userDetails.email, userDetails.phoneNumber, encryptedPassword]);
        res.status(200).send({messeage: "user created successfuly", userDetails: user_insert});
    }
}

module.exports = LoginController;
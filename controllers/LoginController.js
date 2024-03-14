const dataBase = require("../database/config");
var CryptoJS = require("crypto-js");
var jwt = require('jsonwebtoken');
const messages = require("../public/messages/messages");
const BaseController = require('./BaseController');
require('dotenv').config();

class LoginController extends BaseController {

    // constructor() {
    //     this.dataBase = dataBase;
    // }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const [user_detail] = await dataBase.query("SELECT * FROM account WHERE email = ?", [email]);
            var user_password = user_detail[0].password
            /// decryption 
            var bytes  = CryptoJS.AES.decrypt(user_password, process.env.PASSWORD_KEY);
            var deCryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
            if (password === deCryptedPassword) {
                const payload = {
                    email: user_detail[0].email,
                    userId: user_detail[0].id,
                    phoneNumber: user_detail[0].phone_number
                }
                const secret = process.env.JWT_TOKEN_KEY;
                const token = jwt.sign(payload, secret);
                var [check_user_loged_befor] = await dataBase.query('SELECT account_id FROM account_token WHERE account_id = ?', [user_detail[0].id]);
                if (check_user_loged_befor[0]?.account_id) {
                    await dataBase.query(`
                        UPDATE account_token
                        SET access_token = ?
                        WHERE account_id = ?`, [token, user_detail[0].id]
                    );
                } else {
                    await dataBase.query(`
                        INSERT INTO account_token (account_id, access_token)
                        VALUES (?, ?)`, [user_detail[0].id, token]
                    );
                }
                return res.status(200).send(this.responseSuccess(messages.login_messages.login_success, {access_token: token}));
            } else {
                res.status(400).send(this.responseFailed('invalid credentials'));
            }

        } catch (err) {
            if (err) throw err
            res.status(500).send("Internal Server Error");
        }
    }

    async registerUser(req, res) {
        var userDetails = req.body;
        const { password } = req.body;
        var encryptedPassword = CryptoJS.AES.encrypt(password, process.env.PASSWORD_KEY).toString();
        const user_insert = await dataBase.query('INSERT INTO account (email, phone_number, password, name, user_name) VALUES(?, ? ,?, ?, ?)', [userDetails.email, userDetails.phoneNumber, encryptedPassword, userDetails.name, userDetails.userName]);
        res.status(200).send({ messeage: "user created successfuly", userDetails: user_insert });
    }
}

module.exports = LoginController;
const dataBase = require("../database/config");
var crypto = require('crypto');
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
            const [user_detail] = await dataBase.query("SELECT * FROM users WHERE email = ?", [email]);
            var user_password = user_detail[0].password
            /// decryption 
            var deKey = crypto.createDecipher(process.env.PASSWORD_ALGO, process.env.PASSWORD_KEY);
            var deCryptedPassword = deKey.update(user_password, 'hex', 'utf8');
            deCryptedPassword += deKey.final('utf-8');
            if (password === deCryptedPassword) {
                const payload = {
                    email: user_detail[0].email,
                    userId: user_detail[0].id,
                    phoneNumber: user_detail[0].phone_number
                }
                const secret = process.env.JWT_TOKEN_KEY;
                const token = jwt.sign(payload, secret);
                var [check_user_loged_befor] = await dataBase.query('SELECT user_id FROM user_token WHERE user_id = ?', [user_detail[0].id]);
                if (check_user_loged_befor[0].user_id) {
                    await dataBase.query(`
                        UPDATE user_token
                        SET access_token = ?
                        WHERE user_id = ?`, [token, user_detail[0].id]
                    );
                } else {
                    await dataBase.query(`
                        INSERT INTO user_token (user_id, access_token)
                        VALUES (?, ?)`, [user_detail[0].id, token]
                    );
                }
                res.status(200).send(this.responseSuccess(messages.login_messages.login_success, {access_token: token}));
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
        var myKey = crypto.createCipher(process.env.PASSWORD_ALGO, process.env.PASSWORD_KEY);
        var encryptedPassword = myKey.update(password, 'utf8', 'hex');
        encryptedPassword += myKey.final('hex');
        const user_insert = await dataBase.query('INSERT INTO users (email, phone_number , password) VALUES(?, ? ,?)', [userDetails.email, userDetails.phoneNumber, encryptedPassword]);
        res.status(200).send({ messeage: "user created successfuly", userDetails: user_insert });
    }
}

module.exports = LoginController;
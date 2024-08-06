const dataBase = require("../database/config");
var CryptoJS = require("crypto-js");
var jwt = require('jsonwebtoken');
const messages = require("../public/messages/messages");
const BaseController = require('./BaseController');
const MailSender = require('../mailer/mail');
require('dotenv').config();

class LoginController extends BaseController {

    constructor() {
        super();
        this.MailSender = new MailSender();
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const [user_detail] = await dataBase.query("SELECT * FROM user WHERE email = ?", [email]);
            var user_password = user_detail[0].password
            /// decryption 
            var bytes = CryptoJS.AES.decrypt(user_password, process.env.PASSWORD_KEY);
            var deCryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
            if (password === deCryptedPassword) {
                const payload = {
                    email: user_detail[0].email,
                    userId: user_detail[0].id,
                    phoneNumber: user_detail[0].phone_number
                }
                const secret = process.env.JWT_TOKEN_KEY;
                const token = jwt.sign(payload, secret);
                var [check_user_loged_befor] = await dataBase.query('SELECT user_id FROM user_token WHERE user_id = ?', [user_detail[0].id]);
                if (check_user_loged_befor[0]?.user_id) {
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
                return res.status(200).send(this.responseSuccess(messages.login_messages.login_success, { access_token: token }));
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
        var otp = Math.random(0, 1);
        otp = Math.floor(otp * 100000);
        this.MailSender.mailToSomeone(userDetails.email, otp);
        const user_insert = await dataBase.query('INSERT INTO user (email, phone_number, password, name, otp) VALUES(?, ? ,?, ?, ?)', [userDetails.email, userDetails.phoneNumber, encryptedPassword, userDetails.name, otp]);
        res.status(200).send({ messeage: "user created successfuly", userDetails: user_insert });
    }

    async getUserList(req, res) {
        var resp = await dataBase.query('SELECT * FROM user');
        res.status(200).send({ messeage: "user list get successfuly", data: resp[0] });
    }

    async setPasscode(req, res) {
        var { user_id, pass_code } = req.body;
        try {
            const result = await dataBase.query(`
                insert into user_passcode (user_id, passcode) values(?, ?)
                `, [user_id, pass_code]);
            res.status(201).send(this.responseSuccess('passcode created successfully', result))
        } catch (error) {
            res.send(error)
        }
    }

    async checkPasscode(req, res) {
        var { user_id, pass_code } = req.body;
        var [user_data] = await dataBase.query(`
            select user_id, passcode
            from user_passcode
            where user_id = ?
            `, [user_id]);
        if (user_data[0].passcode == pass_code) {
            res.status(200).send(this.responseSuccess('successfully loged in', 0))
        } else {
            res.status(400).send(this.responseFailed('something went wrong'));
        }

    }

    async resendOtp(req, res) {
        var { email } = req.body
        var otp = Math.random(0, 1);
        otp = Math.floor(otp * 100000);
        this.MailSender.mailToSomeone(email, otp);

        try {
            var result = await dataBase.query(`
                update user
                set otp = ${otp}
                where email = '${email}'`
            );
            res.status(200).send(this.responseSuccess('successfully resend the  otp', result))
        } catch (error) {
            console.log(error);
            res.status(400).send(this.responseFailed('something went wrong'));
        }

    }

    async checkOtp(req, res) {
        var { email, otp } = req.body;
        const [user_data] = await dataBase.query(`
            select *
            from user
            where email = ?
            `, [email])
        if (user_data[0].otp == otp) {
            res.status(200).send(this.responseSuccess('successfully verified otp in', 1))
        } else {
            res.status(400).send(this.responseFailed('something went wrong'));
        }

    }

    async checkToken(token) {
        try {
            const [user] = await dataBase.query(`
                select name, user_id, user.email
                from user_token
                left join user on user.id = user_token.user_id
                where access_token = ?
                `, [token]
            )
            return user;
        } catch (error) {
            return false;
        }

    }

    async userDetail(req, res) {
        var token = req.headers;
        token = token.accesstoken;
        try {
            if(token.lenght){
            const [result] = await dataBase.query(`
                select *
                from user_token
                left join user on user.id = user_token.user_id
                where access_token = ?
                `, [token]
            );
                res.status(200).send(this.responseSuccess('successfully verified otp in', result[0]))
            }
        } catch (error) {
            res.status(401).send(this.responseFailed('Not Authorize'));
        }


    }


}

module.exports = LoginController;
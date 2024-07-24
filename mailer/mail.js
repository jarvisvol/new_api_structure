var nodemailer = require('nodemailer');
require('dotenv').config();


class MailSender{
    constructor(){

    }

    async mailToSomeone(email, otp){
        var transpoter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.EMAIL_KEY
                }
            })
        var mailOptions = {
            from: process.env.EMAIL,
            to: email,
            text: `Your one time password is ${otp}`,
            subject: 'OTP'
        }
        await transpoter.sendMail(mailOptions);
    }

}

module.exports = MailSender;
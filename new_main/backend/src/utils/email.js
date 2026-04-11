const nodemailer = require('nodemailer');
require('./configLoader');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', // or 'outlook'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // The 16-character App password
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your Game Account',
        html: `
            <h1>Welcome to the Game Tutorial</h1>
            <p>Please click the link below to verify your email address and join the ranked lobby:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            <p>If you did not create an account, you can ignore this email.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail
};

const nodemailer = require('nodemailer');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { parentName, childName, parentEmail, results } = JSON.parse(event.body);

    // --- Configuration for SMTP2GO ---
    // IMPORTANT: Get these from Netlify Environment Variables for security!
    // Set these in Netlify Dashboard: Site settings > Build & deploy > Environment variables
    const smtpHost = process.env.SMTP2GO_HOST || 'mail.smtp2go.com';
    const smtpPort = process.env.SMTP2GO_PORT || 2525; // Or 25, 8025, 587
    const smtpUser = process.env.SMTP2GO_USER;       // Your SMTP2GO username
    const smtpPass = process.env.SMTP2GO_PASSWORD;   // Your SMTP2GO API Key

    const senderEmail = process.env.SENDER_EMAIL;	// Your verified sender email
    const recipientEmail = process.env.RECIPIENT_EMAIL;	// Where results are sent

    if (!smtpUser || !smtpPass) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'SMTP2GO credentials not configured.' })
        };
    }

    let transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false, // true for 465, false for other ports like 587, 2525
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        tls: {
            rejectUnauthorized: false // Use this if you encounter self-signed certificate issues, but prefer true
        }
    });

    const mailOptions = {
        from: senderEmail,
        to: recipientEmail, // The fixed email address where you want results
        replyTo: parentEmail, // Allows you to reply directly to the parent
        subject: `KS1 Assessment Results for ${childName}`,
        text: `Parent Name: ${parentName}\nChild Name: ${childName}\nParent Email: ${parentEmail}\n\n${results}`,
        // You could also create an HTML version of the email for better formatting
        // html: `<p><strong>Parent Name:</strong> ${parentName}</p>...`
    };

    try {
        await transporter.sendMail(mailOptions);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Email sent successfully!' })
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to send email.', error: error.message })
        };
    }
};
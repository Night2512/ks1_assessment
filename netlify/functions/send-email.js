const nodemailer = require('nodemailer');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Updated to receive both text and HTML versions of results
    const { parentName, childName, parentEmail, resultsText, resultsHtml, keyStage } = JSON.parse(event.body);

    // --- Configuration for SMTP2GO ---
    const smtpHost = process.env.SMTP2GO_HOST || 'mail.smtp2go.com';
    const smtpPort = process.env.SMTP2GO_PORT || 2525; // Or 25, 8025, 587
    const smtpUser = process.env.SMTP2GO_USER;       // Your SMTP2GO username
    const smtpPass = process.env.SMTP2GO_PASSWORD;   // Your SMTP2GO API Key

    const senderEmail = process.env.SENDER_EMAIL || 'your_sending_email@example.com'; // Your verified sender email
    const adminRecipientEmail = process.env.RECIPIENT_EMAIL; // Your admin email from Netlify environment variables

    // Basic validation
    if (!smtpUser || !smtpPass) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'SMTP2GO credentials not configured.' })
        };
    }
    if (!parentEmail || !senderEmail) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required email addresses.' })
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
            rejectUnauthorized: false // Use this if you encounter self-signed certificate issues, but prefer true for production
        }
    });

    const mailOptions = {
        from: senderEmail,
        to: parentEmail,                     // Send to the parent's email
        bcc: adminRecipientEmail,            // BCC a copy to your admin email
        replyTo: parentEmail,                // Replies go to the parent
        subject: `${keyStage} Assessment Results for ${childName}`,
        text: resultsText,                   // Plain text version for compatibility
        html: resultsHtml                    // HTML version for presentable formatting
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
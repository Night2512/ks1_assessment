const fetch = require('node-fetch'); // You might need to add "node-fetch" to your package.json dependencies

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { turnstileToken } = JSON.parse(event.body);

    if (!turnstileToken) {
        return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Turnstile token missing.' }) };
    }

    // Retrieve your Secret Key from Netlify environment variables
    const CLOUDFLARE_SECRET_KEY = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    if (!CLOUDFLARE_SECRET_KEY) {
        console.error('Cloudflare Turnstile secret key is not set in environment variables.');
        return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server configuration error.' }) };
    }

    const verificationURL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formParams = new URLSearchParams();
    formParams.append('secret', CLOUDFLARE_SECRET_KEY);
    formParams.append('response', turnstileToken);
    // Optional: for additional security checks, you can include the user's IP
    // formParams.append('remoteip', event.headers['client-ip']);

    try {
        const response = await fetch(verificationURL, {
            method: 'POST',
            body: formParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const data = await response.json();

        if (data.success) {
            // Turnstile verification successful.
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: 'Verification successful!' }),
            };
        } else {
            console.error('Turnstile verification failed:', data['error-codes']);
            return {
                statusCode: 401,
                body: JSON.stringify({ success: false, message: 'Security check failed.', errors: data['error-codes'] }),
            };
        }
    } catch (error) {
        console.error('Error verifying Turnstile:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Internal server error during verification.' }),
        };
    }
};
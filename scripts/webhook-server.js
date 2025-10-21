const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 3333;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'change-me-to-secure-secret';
const DEPLOY_SCRIPT = '/var/www/hoatdongrenluyen/scripts/deploy.sh';
const LOG_FILE = '/var/log/webhook-deploy.log';

// Middleware to parse JSON
app.use(express.json());

// Log function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage);
    fs.appendFileSync(LOG_FILE, logMessage);
}

// Verify GitHub webhook signature
function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return false;
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GitHub webhook endpoint
app.post('/webhook', (req, res) => {
    log('Received webhook request');

    // Verify signature
    if (!verifySignature(req)) {
        log('❌ Invalid signature!');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    const payload = req.body;

    log(`Event: ${event}`);
    log(`Branch: ${payload.ref}`);

    // Only deploy on push to main branch
    if (event === 'push' && payload.ref === 'refs/heads/main') {
        log('✅ Push to main detected. Starting deployment...');

        // Respond immediately
        res.status(200).json({ message: 'Deployment started' });

        // Execute deployment script
        exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
            if (error) {
                log(`❌ Deployment error: ${error.message}`);
                log(`stderr: ${stderr}`);
                return;
            }
            log(`✅ Deployment output: ${stdout}`);
        });
    } else {
        log(`ℹ️  Ignoring event: ${event} on ${payload.ref}`);
        res.status(200).json({ message: 'Event ignored' });
    }
});

// Start server
app.listen(PORT, () => {
    log(`🚀 Webhook server running on port ${PORT}`);
    log(`📝 Logs: ${LOG_FILE}`);
    log(`🔐 Webhook secret configured: ${WEBHOOK_SECRET !== 'change-me-to-secure-secret' ? 'Yes' : 'No (CHANGE IT!)'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

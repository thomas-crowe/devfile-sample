require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Database connection setup (PostgreSQL)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

// Authentication Middleware (if needed)
const requireAuth = (req, res, next) => {
  const incomingToken = req.headers['x-webhook-secret'];
  const expectedToken = process.env.WEBHOOK_SECRET;

  if (!incomingToken || incomingToken !== expectedToken) {
    console.warn(`Unauthorized access attempt to webhook endpoint from IP:, ${req.ip}`);
    return res.status(403).send('Forbidden: Invalid or missing token');
  }
  next();
};

// Middleware to parse incoming JSON payloads
app.use(bodyParser.json());

// Middleware to parse incoming JSON payloads
// This is essential for the server to understand the JSON sent by the webhook
app.use(express.json());

// The Webhook Endpoint
app.post('/webhook', requireAuth, async (req, res) => {
  
  const payload = req.body;
 
  if (!payload || Object.keys(payload).length === 0) {
    console.error('Received empty payload');
    return res.status(400).send('Payload required');
  }

  try {
    // Example: Insert payload into a database table named 'webhooks'
    const eventType = payload.type || 'unknown';
    const query = `
        INSERT INTO ghl_webhook(event_type, payload) 
        VALUES($1, $2)
        RETURNING id;
        `;

    const values = [eventType, JSON.stringify(payload)];
    const result = await pool.query(query, values);

    console.log(`Inserted webhook with ID: ${result.rows[0].id}`);
    res.status(200).send({ status: 'success', message: 'Webhook received and stored successfully' });

  } catch (error) {
    console.error('Error inserting JSON into database:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Webhook listener running on http://localhost:${PORT}`);
});
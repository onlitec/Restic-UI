require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const snapshotsRoutes = require('./routes/snapshots');
const jobsRoutes = require('./routes/jobs');
const schedulesRoutes = require('./routes/schedules');
const statsRoutes = require('./routes/stats');
const { initScheduler } = require('./services/scheduler.service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/stats', statsRoutes);

// WebSocket for real-time updates
wss.on('connection', (ws) => {
    console.log('📡 WebSocket client connected');

    ws.on('close', () => {
        console.log('📡 WebSocket client disconnected');
    });
});

// Broadcast to all WebSocket clients
app.locals.broadcast = (type, data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type, data }));
        }
    });
};

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3500;

server.listen(PORT, async () => {
    console.log(`🚀 Restic UI Backend running on port ${PORT}`);

    // Test database connection
    try {
        await db.query('SELECT NOW()');
        console.log('✅ Database connection verified');
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }

    // Initialize scheduler
    initScheduler();
});

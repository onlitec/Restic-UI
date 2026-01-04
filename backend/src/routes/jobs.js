const express = require('express');
const db = require('../config/database');
const dockerBackupService = require('../services/docker-backup.service');
const { authMiddleware, operatorOrAdmin, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// List all backup jobs
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT j.*, 
        (SELECT COUNT(*) FROM backup_history h WHERE h.job_id = j.id) as total_runs,
        (SELECT status FROM backup_history h WHERE h.job_id = j.id ORDER BY h.started_at DESC LIMIT 1) as last_status,
        (SELECT started_at FROM backup_history h WHERE h.job_id = j.id ORDER BY h.started_at DESC LIMIT 1) as last_run
      FROM backup_jobs j
      ORDER BY j.name`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list jobs', details: error.message });
    }
});

// Get job by name
router.get('/:name', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT j.*, 
        (SELECT COUNT(*) FROM backup_history h WHERE h.job_id = j.id) as total_runs,
        (SELECT COUNT(*) FROM backup_history h WHERE h.job_id = j.id AND h.status = 'success') as successful_runs,
        (SELECT COUNT(*) FROM backup_history h WHERE h.job_id = j.id AND h.status = 'failed') as failed_runs
      FROM backup_jobs j
      WHERE j.name = $1`,
            [req.params.name]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get job', details: error.message });
    }
});

// Get job execution history
router.get('/:name/history', async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const result = await db.query(
            `SELECT h.* FROM backup_history h
       JOIN backup_jobs j ON h.job_id = j.id
       WHERE j.name = $1
       ORDER BY h.started_at DESC
       LIMIT $2 OFFSET $3`,
            [req.params.name, parseInt(limit), parseInt(offset)]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get history', details: error.message });
    }
});

// Run backup manually (operator or admin only)
router.post('/:name/run', operatorOrAdmin, async (req, res) => {
    try {
        const jobName = req.params.name;

        // Check if job exists
        const jobResult = await db.query(
            'SELECT * FROM backup_jobs WHERE name = $1 AND enabled = true',
            [jobName]
        );

        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or disabled' });
        }

        // Start backup in background
        const broadcast = req.app.locals.broadcast;

        // Return immediately with history ID
        res.json({
            message: 'Backup started',
            jobName,
            note: 'Monitor progress via WebSocket'
        });

        // Run backup asynchronously
        dockerBackupService.runBackup(jobName, broadcast)
            .catch(err => console.error(`Background backup failed: ${err.message}`));

    } catch (error) {
        res.status(500).json({ error: 'Failed to start backup', details: error.message });
    }
});

// Create new job (admin only)
router.post('/', adminOnly, async (req, res) => {
    try {
        const { name, description, script_path, tags = [], source_paths = [] } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Job name required' });
        }

        const result = await db.query(
            `INSERT INTO backup_jobs (name, description, script_path, tags, source_paths)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name, description, script_path, tags, source_paths]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Job name already exists' });
        }
        res.status(500).json({ error: 'Failed to create job', details: error.message });
    }
});

// Update job (admin only)
router.put('/:name', adminOnly, async (req, res) => {
    try {
        const { description, script_path, tags, source_paths, enabled } = req.body;

        const result = await db.query(
            `UPDATE backup_jobs SET
        description = COALESCE($1, description),
        script_path = COALESCE($2, script_path),
        tags = COALESCE($3, tags),
        source_paths = COALESCE($4, source_paths),
        enabled = COALESCE($5, enabled),
        updated_at = NOW()
      WHERE name = $6
      RETURNING *`,
            [description, script_path, tags, source_paths, enabled, req.params.name]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update job', details: error.message });
    }
});

// Delete job (admin only)
router.delete('/:name', adminOnly, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM backup_jobs WHERE name = $1 RETURNING id',
            [req.params.name]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ message: 'Job deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete job', details: error.message });
    }
});

// Get running backups
router.get('/status/running', async (req, res) => {
    try {
        // Get from Docker
        const dockerRunning = await dockerBackupService.getRunningBackups();

        // Get from database
        const dbResult = await db.query(
            `SELECT h.*, j.name as job_name
       FROM backup_history h
       JOIN backup_jobs j ON h.job_id = j.id
       WHERE h.status = 'running'
       ORDER BY h.started_at DESC`
        );

        res.json({
            containers: dockerRunning,
            history: dbResult.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get running backups', details: error.message });
    }
});

module.exports = router;

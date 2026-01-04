const express = require('express');
const db = require('../config/database');
const schedulerService = require('../services/scheduler.service');
const { authMiddleware, operatorOrAdmin, adminOnly } = require('../middleware/auth.middleware');
const cron = require('node-cron');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// List all schedules
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, j.name as job_name, j.description as job_description
       FROM schedules s
       JOIN backup_jobs j ON s.job_id = j.id
       ORDER BY s.next_run ASC NULLS LAST`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list schedules', details: error.message });
    }
});

// Get schedule by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, j.name as job_name
       FROM schedules s
       JOIN backup_jobs j ON s.job_id = j.id
       WHERE s.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get schedule', details: error.message });
    }
});

// Create new schedule (operator or admin)
router.post('/', operatorOrAdmin, async (req, res) => {
    try {
        const { job_id, cron_expression, description = '' } = req.body;

        if (!job_id || !cron_expression) {
            return res.status(400).json({ error: 'job_id and cron_expression required' });
        }

        // Validate cron expression
        if (!cron.validate(cron_expression)) {
            return res.status(400).json({ error: 'Invalid cron expression' });
        }

        // Verify job exists
        const jobResult = await db.query('SELECT id, name FROM backup_jobs WHERE id = $1', [job_id]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const schedule = await schedulerService.addSchedule(job_id, cron_expression, description);

        res.status(201).json({
            ...schedule,
            job_name: jobResult.rows[0].name
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create schedule', details: error.message });
    }
});

// Update schedule (operator or admin)
router.put('/:id', operatorOrAdmin, async (req, res) => {
    try {
        const { cron_expression, enabled, description } = req.body;

        // Validate cron expression if provided
        if (cron_expression && !cron.validate(cron_expression)) {
            return res.status(400).json({ error: 'Invalid cron expression' });
        }

        // Update in database
        const result = await db.query(
            `UPDATE schedules SET
        cron_expression = COALESCE($1, cron_expression),
        enabled = COALESCE($2, enabled),
        description = COALESCE($3, description),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
            [cron_expression, enabled, description, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Update scheduler
        await schedulerService.updateSchedule(
            parseInt(req.params.id),
            cron_expression,
            enabled
        );

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update schedule', details: error.message });
    }
});

// Delete schedule (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        await schedulerService.removeSchedule(parseInt(req.params.id));
        res.json({ message: 'Schedule deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule', details: error.message });
    }
});

// Get common cron presets
router.get('/presets/list', (req, res) => {
    res.json([
        { label: 'Every hour', expression: '0 * * * *' },
        { label: 'Every 6 hours', expression: '0 */6 * * *' },
        { label: 'Daily at midnight', expression: '0 0 * * *' },
        { label: 'Daily at 2 AM', expression: '0 2 * * *' },
        { label: 'Daily at 3 AM', expression: '0 3 * * *' },
        { label: 'Weekly on Sunday at 2 AM', expression: '0 2 * * 0' },
        { label: 'Weekly on Monday at 3 AM', expression: '0 3 * * 1' },
        { label: 'Monthly on 1st at 2 AM', expression: '0 2 1 * *' },
    ]);
});

module.exports = router;

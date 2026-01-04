const express = require('express');
const { execSync } = require('child_process');
const db = require('../config/database');
const resticService = require('../services/restic.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * Get disk usage for the backup destination
 */
function getDiskUsage(path = '/repo') {
  try {
    // Use df command to get disk usage
    // Using -P for POSIX format (single line output)
    const output = execSync(`df -B1 -P ${path} 2>/dev/null | tail -1`, { encoding: 'utf-8' });
    const parts = output.trim().split(/\s+/);

    // POSIX format: Filesystem 1-blocks Used Available Capacity Mounted
    if (parts.length >= 5) {
      const total = parseInt(parts[1]) || 0;
      const used = parseInt(parts[2]) || 0;
      const available = parseInt(parts[3]) || 0;
      const usedPercent = parseInt(parts[4]) || 0;
      const mountPoint = parts[5] || path;

      return {
        total,
        used,
        available,
        usedPercent,
        mountPoint,
        error: null
      };
    }
    return { error: 'Failed to parse disk usage' };
  } catch (error) {
    return { error: error.message };
  }
}

// All routes require authentication
router.use(authMiddleware);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Repository info from Restic
    let repoInfo = {};
    try {
      repoInfo = await resticService.getRepoInfo();
    } catch (e) {
      repoInfo = { error: e.message };
    }

    // Jobs stats from database
    const jobsResult = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE enabled = true) as active_jobs
      FROM backup_jobs
    `);

    // Recent history
    const historyResult = await db.query(`
      SELECT 
        COUNT(*) as total_backups,
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        SUM(bytes_added) as total_bytes_added
      FROM backup_history
      WHERE started_at > NOW() - INTERVAL '30 days'
    `);

    // Last 7 days trend
    const trendResult = await db.query(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM backup_history
      WHERE started_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(started_at)
      ORDER BY date
    `);

    // Upcoming schedules
    const schedulesResult = await db.query(`
      SELECT s.next_run, j.name as job_name
      FROM schedules s
      JOIN backup_jobs j ON s.job_id = j.id
      WHERE s.enabled = true AND s.next_run IS NOT NULL
      ORDER BY s.next_run
      LIMIT 5
    `);

    // Disk usage of backup destination
    const diskUsage = getDiskUsage('/repo');

    res.json({
      repository: repoInfo,
      jobs: jobsResult.rows[0],
      history: historyResult.rows[0],
      trend: trendResult.rows,
      upcomingBackups: schedulesResult.rows,
      diskUsage,
    });
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get statistics', details: error.message });
  }
});

// Get backup history stats
router.get('/history', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await db.query(`
      SELECT 
        h.*,
        j.name as job_name
      FROM backup_history h
      JOIN backup_jobs j ON h.job_id = j.id
      WHERE h.started_at > NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY h.started_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history', details: error.message });
  }
});

// Get storage stats over time
router.get('/storage', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        DATE(started_at) as date,
        SUM(bytes_added) as bytes_added,
        SUM(files_new) as files_new,
        SUM(files_changed) as files_changed
      FROM backup_history
      WHERE started_at > NOW() - INTERVAL '30 days' AND status = 'success'
      GROUP BY DATE(started_at)
      ORDER BY date
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get storage stats', details: error.message });
  }
});

// Get per-job statistics
router.get('/jobs', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        j.name,
        j.description,
        COUNT(h.id) as total_runs,
        COUNT(h.id) FILTER (WHERE h.status = 'success') as successful,
        COUNT(h.id) FILTER (WHERE h.status = 'failed') as failed,
        MAX(h.started_at) as last_run,
        AVG(EXTRACT(EPOCH FROM (h.finished_at - h.started_at))) as avg_duration_seconds,
        SUM(h.bytes_added) as total_bytes
      FROM backup_jobs j
      LEFT JOIN backup_history h ON j.id = h.job_id
      GROUP BY j.id
      ORDER BY j.name
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job stats', details: error.message });
  }
});

// Repository check
router.post('/check', async (req, res) => {
  try {
    const { readData = false } = req.body;
    const result = await resticService.check(readData);
    res.json({ message: 'Repository check completed', output: result });
  } catch (error) {
    res.status(500).json({ error: 'Repository check failed', details: error.message });
  }
});

// Prune repository
router.post('/prune', async (req, res) => {
  try {
    const result = await resticService.prune();
    res.json({ message: 'Repository pruned', output: result });
  } catch (error) {
    res.status(500).json({ error: 'Prune failed', details: error.message });
  }
});

module.exports = router;

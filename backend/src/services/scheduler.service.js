const cron = require('node-cron');
const db = require('../config/database');
const dockerBackupService = require('./docker-backup.service');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Initialize the scheduler from database
 */
async function initScheduler() {
    console.log('⏰ Initializing backup scheduler...');

    try {
        const result = await db.query(
            `SELECT s.*, j.name as job_name 
       FROM schedules s 
       JOIN backup_jobs j ON s.job_id = j.id 
       WHERE s.enabled = true AND j.enabled = true`
        );

        for (const schedule of result.rows) {
            scheduleJob(schedule);
        }

        console.log(`⏰ Loaded ${result.rows.length} scheduled jobs`);
    } catch (error) {
        console.error('❌ Failed to initialize scheduler:', error);
    }
}

/**
 * Schedule a single job
 */
function scheduleJob(schedule) {
    const { id, job_name, cron_expression } = schedule;

    // Cancel existing job if any
    if (activeJobs.has(id)) {
        activeJobs.get(id).stop();
    }

    // Validate cron expression
    if (!cron.validate(cron_expression)) {
        console.error(`❌ Invalid cron expression for schedule ${id}: ${cron_expression}`);
        return false;
    }

    // Create new cron job
    const job = cron.schedule(cron_expression, async () => {
        console.log(`⏰ Running scheduled backup: ${job_name}`);

        try {
            // Update last_run
            await db.query(
                'UPDATE schedules SET last_run = NOW() WHERE id = $1',
                [id]
            );

            // Run the backup
            await dockerBackupService.runBackup(job_name);

            // Update next_run
            const nextRun = getNextRunDate(cron_expression);
            await db.query(
                'UPDATE schedules SET next_run = $1 WHERE id = $2',
                [nextRun, id]
            );

        } catch (error) {
            console.error(`❌ Scheduled backup failed for ${job_name}:`, error);
        }
    });

    activeJobs.set(id, job);

    // Update next_run in database
    const nextRun = getNextRunDate(cron_expression);
    db.query('UPDATE schedules SET next_run = $1 WHERE id = $2', [nextRun, id]);

    console.log(`✅ Scheduled: ${job_name} (${cron_expression}) - Next: ${nextRun}`);
    return true;
}

/**
 * Get the next run date for a cron expression
 */
function getNextRunDate(cronExpression) {
    const interval = cron.validate(cronExpression)
        ? require('cron-parser').parseExpression(cronExpression)
        : null;

    if (interval) {
        return interval.next().toDate();
    }
    return null;
}

/**
 * Add or update a schedule
 */
async function addSchedule(jobId, cronExpression, description = '') {
    const result = await db.query(
        `INSERT INTO schedules (job_id, cron_expression, description, enabled) 
     VALUES ($1, $2, $3, true) 
     RETURNING *`,
        [jobId, cronExpression, description]
    );

    const schedule = result.rows[0];

    // Get job name
    const jobResult = await db.query('SELECT name FROM backup_jobs WHERE id = $1', [jobId]);
    schedule.job_name = jobResult.rows[0].name;

    scheduleJob(schedule);

    return schedule;
}

/**
 * Remove a schedule
 */
async function removeSchedule(scheduleId) {
    if (activeJobs.has(scheduleId)) {
        activeJobs.get(scheduleId).stop();
        activeJobs.delete(scheduleId);
    }

    await db.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);
}

/**
 * Update a schedule
 */
async function updateSchedule(scheduleId, cronExpression, enabled) {
    const result = await db.query(
        `UPDATE schedules 
     SET cron_expression = COALESCE($1, cron_expression),
         enabled = COALESCE($2, enabled),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
        [cronExpression, enabled, scheduleId]
    );

    const schedule = result.rows[0];

    if (enabled === false) {
        // Stop the job
        if (activeJobs.has(scheduleId)) {
            activeJobs.get(scheduleId).stop();
            activeJobs.delete(scheduleId);
        }
    } else {
        // Reschedule
        const jobResult = await db.query('SELECT name FROM backup_jobs WHERE id = $1', [schedule.job_id]);
        schedule.job_name = jobResult.rows[0].name;
        scheduleJob(schedule);
    }

    return schedule;
}

module.exports = {
    initScheduler,
    scheduleJob,
    addSchedule,
    removeSchedule,
    updateSchedule,
    getActiveJobs: () => Array.from(activeJobs.keys()),
};

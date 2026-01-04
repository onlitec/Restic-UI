const Docker = require('dockerode');
const path = require('path');
const db = require('../config/database');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * Sanitize log string to remove null bytes and invalid UTF8 characters
 */
function sanitizeLog(log) {
    if (!log) return '';
    // Remove null bytes and other control characters except newline, tab, carriage return
    return log
        .replace(/\x00/g, '') // Remove null bytes
        .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove other control chars
        .replace(/[^\x09\x0A\x0D\x20-\x7E\x80-\xFF\u0100-\uFFFF]/g, ''); // Keep valid chars
}

class DockerBackupService {
    /**
     * Run a backup job by executing its container
     */
    async runBackup(jobName, broadcast = null) {
        console.log(`🚀 Starting backup job: ${jobName}`);

        // Get job configuration
        const jobResult = await db.query(
            'SELECT * FROM backup_jobs WHERE name = $1 AND enabled = true',
            [jobName]
        );

        if (jobResult.rows.length === 0) {
            throw new Error(`Job not found or disabled: ${jobName}`);
        }

        const job = jobResult.rows[0];

        // Create history entry
        const historyResult = await db.query(
            'INSERT INTO backup_history (job_id, job_name, started_at, status) VALUES ($1, $2, NOW(), $3) RETURNING id',
            [job.id, jobName, 'running']
        );
        const historyId = historyResult.rows[0].id;

        // Broadcast start event
        if (broadcast) {
            broadcast('backup_started', { jobName, historyId });
        }

        try {
            // Create and run container
            // Note: restic/restic image has ENTRYPOINT ["restic"], we need to override it
            const container = await docker.createContainer({
                Image: 'restic/restic:latest',
                name: `backup-${jobName}-${Date.now()}`,
                Entrypoint: ['/bin/sh'],
                Cmd: [`/scripts/backup-${jobName}.sh`],
                Env: [
                    `RESTIC_REPOSITORY=/repo`,
                    `RESTIC_PASSWORD=${process.env.RESTIC_PASSWORD}`,
                ],
                HostConfig: {
                    Binds: [
                        '/var/lib/docker/volumes:/var/lib/docker/volumes:ro',
                        '/backup/pbs:/repo',
                        `${process.env.SCRIPTS_PATH || '/home/alfreire/docker/apps/restic-ui/scripts'}:/scripts:ro`,
                    ],
                    AutoRemove: true,
                },
            });

            // Start container and wait for completion
            await container.start();

            // Stream logs
            const logStream = await container.logs({
                follow: true,
                stdout: true,
                stderr: true,
            });

            let fullLog = '';

            logStream.on('data', (chunk) => {
                const logLine = sanitizeLog(chunk.toString('utf8'));
                fullLog += logLine;

                if (broadcast) {
                    broadcast('backup_progress', {
                        jobName,
                        historyId,
                        log: logLine
                    });
                }
            });

            // Wait for container to finish
            const result = await container.wait();

            // Parse results from log if possible
            const stats = this.parseBackupStats(fullLog);

            // Update history
            await db.query(
                `UPDATE backup_history SET 
          finished_at = NOW(), 
          status = $1,
          files_new = $2,
          files_changed = $3,
          bytes_added = $4,
          log = $5
        WHERE id = $6`,
                [
                    result.StatusCode === 0 ? 'success' : 'failed',
                    stats.filesNew || 0,
                    stats.filesChanged || 0,
                    stats.bytesAdded || 0,
                    sanitizeLog(fullLog),
                    historyId
                ]
            );

            // Broadcast completion
            if (broadcast) {
                broadcast('backup_completed', {
                    jobName,
                    historyId,
                    status: result.StatusCode === 0 ? 'success' : 'failed',
                    stats
                });
            }

            return {
                success: result.StatusCode === 0,
                historyId,
                stats,
                log: fullLog
            };

        } catch (error) {
            console.error(`❌ Backup failed for ${jobName}:`, error);

            // Update history with error
            await db.query(
                `UPDATE backup_history SET 
          finished_at = NOW(), 
          status = 'failed',
          error_message = $1
        WHERE id = $2`,
                [error.message, historyId]
            );

            if (broadcast) {
                broadcast('backup_failed', { jobName, historyId, error: error.message });
            }

            throw error;
        }
    }

    /**
     * Parse backup statistics from log output
     */
    parseBackupStats(log) {
        const stats = {
            filesNew: 0,
            filesChanged: 0,
            filesUnmodified: 0,
            bytesAdded: 0,
        };

        // Try to parse JSON summary from restic output
        const lines = log.split('\n');
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.message_type === 'summary') {
                    stats.filesNew = data.files_new || 0;
                    stats.filesChanged = data.files_changed || 0;
                    stats.filesUnmodified = data.files_unmodified || 0;
                    stats.bytesAdded = data.data_added || 0;
                    break;
                }
            } catch (e) {
                // Not JSON, continue
            }
        }

        return stats;
    }

    /**
     * List running backup containers
     */
    async getRunningBackups() {
        const containers = await docker.listContainers({
            filters: {
                name: ['backup-'],
                status: ['running']
            }
        });

        return containers.map(c => ({
            id: c.Id,
            name: c.Names[0].replace('/', ''),
            status: c.Status,
            created: c.Created
        }));
    }
}

module.exports = new DockerBackupService();

const { exec } = require('child_process');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

class ResticService {
    constructor() {
        this.env = {
            ...process.env,
            RESTIC_REPOSITORY: process.env.RESTIC_REPOSITORY || '/repo',
            RESTIC_PASSWORD: process.env.RESTIC_PASSWORD,
        };
    }

    /**
     * Check if repository is accessible (detect NFS hangs)
     */
    async checkRepository() {
        try {
            // Use a short timeout to detect hangs
            await execAsync('ls -d /repo', { timeout: 2000 });
            return true;
        } catch (error) {
            console.error('⚠️ Repository /repo is not accessible (possible NFS hang):', error.message);
            return false;
        }
    }

    /**
     * Execute a restic command and return JSON output
     */
    async execRestic(args, options = {}) {
        const isAccessible = await this.checkRepository();
        if (!isAccessible) {
            throw new Error('Repository is currently inaccessible (NFS mount might be hung)');
        }

        try {
            const cmd = `restic ${args.join(' ')} --json`;
            console.log(`🔧 Executing: ${cmd}`);

            const { stdout } = await execAsync(cmd, {
                env: this.env,
                encoding: 'utf-8',
                timeout: options.timeout || 60000,
                ...options
            });

            return JSON.parse(stdout);
        } catch (error) {
            // Check if there's still valid JSON output
            if (error.stdout) {
                try {
                    return JSON.parse(error.stdout);
                } catch (e) { }
            }
            throw new Error(`Restic command failed: ${error.message}`);
        }
    }

    /**
     * Execute restic command and return raw output
     */
    async execResticRaw(args, options = {}) {
        const isAccessible = await this.checkRepository();
        if (!isAccessible) {
            throw new Error('Repository is currently inaccessible (NFS mount might be hung)');
        }

        try {
            const cmd = `restic ${args.join(' ')}`;
            console.log(`🔧 Executing: ${cmd}`);

            const { stdout } = await execAsync(cmd, {
                env: this.env,
                encoding: 'utf-8',
                timeout: options.timeout || 60000,
                ...options
            });

            return stdout;
        } catch (error) {
            throw new Error(`Restic command failed: ${error.message}`);
        }
    }

    /**
     * Get all snapshots, optionally filtered by tag
     */
    async getSnapshots(tag = null) {
        const args = ['snapshots'];
        if (tag) {
            args.push('--tag', tag);
        }
        return this.execRestic(args);
    }

    /**
     * Get a specific snapshot by ID
     */
    async getSnapshot(id) {
        const snapshots = await this.execRestic(['snapshots', id]);
        return snapshots[0] || null;
    }

    /**
     * List files in a snapshot
     */
    async getSnapshotFiles(id, path = '/') {
        const args = ['ls', id, '--json'];
        if (path !== '/') {
            args.push(path);
        }

        const output = await this.execResticRaw(['ls', id, '--json']);
        const files = output.trim().split('\n')
            .filter(line => line)
            .map(line => JSON.parse(line));

        return files;
    }

    /**
     * Get repository statistics
     */
    async getStats() {
        return this.execRestic(['stats', '--mode', 'raw-data']);
    }

    /**
     * Get repository cache info
     */
    async getRepoInfo() {
        try {
            const isAccessible = await this.checkRepository();
            if (!isAccessible) {
                return {
                    totalSnapshots: 0,
                    totalSize: 0,
                    totalFileCount: 0,
                    snapshotsByTag: {},
                    error: 'Repository inaccessible (NFS mount hung)'
                };
            }

            const stats = await this.getStats();
            const snapshots = await this.getSnapshots();

            return {
                repository: this.env.RESTIC_REPOSITORY,
                totalSnapshots: snapshots.length,
                totalSize: stats.total_size,
                totalFileCount: stats.total_file_count,
                snapshotsByTag: this.groupSnapshotsByTag(snapshots),
            };
        } catch (error) {
            console.error('Failed to get repo info:', error);
            return {
                totalSnapshots: 0,
                totalSize: 0,
                totalFileCount: 0,
                snapshotsByTag: {},
                error: error.message
            };
        }
    }

    /**
     * Group snapshots by tag
     */
    groupSnapshotsByTag(snapshots) {
        const grouped = {};
        for (const snap of snapshots) {
            for (const tag of snap.tags || ['untagged']) {
                if (!grouped[tag]) {
                    grouped[tag] = [];
                }
                grouped[tag].push(snap);
            }
        }
        return grouped;
    }

    /**
     * Forget (delete) a snapshot
     */
    async forgetSnapshot(id, prune = false) {
        const args = ['forget', id];
        if (prune) {
            args.push('--prune');
        }
        return this.execResticRaw(args, { timeout: 300000 });
    }

    /**
     * Run prune to clean up the repository
     */
    async prune() {
        return this.execResticRaw(['prune'], { timeout: 600000 });
    }

    /**
     * Check repository integrity
     */
    async check(readData = false) {
        const args = ['check'];
        if (readData) {
            args.push('--read-data');
        }
        return this.execResticRaw(args, { timeout: 600000 });
    }

    /**
     * Get diff between two snapshots
     */
    async diff(snapshot1, snapshot2) {
        const output = await this.execResticRaw(['diff', snapshot1, snapshot2, '--json']);
        const changes = output.trim().split('\n')
            .filter(line => line)
            .map(line => JSON.parse(line));
        return changes;
    }
}

module.exports = new ResticService();

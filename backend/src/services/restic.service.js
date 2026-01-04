const { execSync, spawn } = require('child_process');
const path = require('path');

class ResticService {
    constructor() {
        this.env = {
            ...process.env,
            RESTIC_REPOSITORY: process.env.RESTIC_REPOSITORY || '/repo',
            RESTIC_PASSWORD: process.env.RESTIC_PASSWORD,
        };
    }

    /**
     * Execute a restic command and return JSON output
     */
    execRestic(args, options = {}) {
        try {
            const cmd = `restic ${args.join(' ')} --json`;
            console.log(`🔧 Executing: ${cmd}`);

            const output = execSync(cmd, {
                env: this.env,
                encoding: 'utf-8',
                timeout: options.timeout || 60000,
                ...options
            });

            return JSON.parse(output);
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
    execResticRaw(args, options = {}) {
        try {
            const cmd = `restic ${args.join(' ')}`;
            console.log(`🔧 Executing: ${cmd}`);

            return execSync(cmd, {
                env: this.env,
                encoding: 'utf-8',
                timeout: options.timeout || 60000,
                ...options
            });
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
        const snapshots = this.execRestic(['snapshots', id]);
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

        const output = this.execResticRaw(['ls', id, '--json']);
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
            const stats = await this.getStats();
            const snapshots = await this.getSnapshots();

            return {
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
        const output = this.execResticRaw(['diff', snapshot1, snapshot2, '--json']);
        const changes = output.trim().split('\n')
            .filter(line => line)
            .map(line => JSON.parse(line));
        return changes;
    }
}

module.exports = new ResticService();

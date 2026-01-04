const express = require('express');
const resticService = require('../services/restic.service');
const { authMiddleware, operatorOrAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// List all snapshots
router.get('/', async (req, res) => {
    try {
        const { tag } = req.query;
        const snapshots = await resticService.getSnapshots(tag);
        res.json(snapshots);
    } catch (error) {
        console.error('Failed to list snapshots:', error);
        res.status(500).json({ error: 'Failed to list snapshots', details: error.message });
    }
});

// Get snapshot by ID
router.get('/:id', async (req, res) => {
    try {
        const snapshot = await resticService.getSnapshot(req.params.id);
        if (!snapshot) {
            return res.status(404).json({ error: 'Snapshot not found' });
        }
        res.json(snapshot);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get snapshot', details: error.message });
    }
});

// List files in a snapshot
router.get('/:id/files', async (req, res) => {
    try {
        const { path = '/' } = req.query;
        const files = await resticService.getSnapshotFiles(req.params.id, path);
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list files', details: error.message });
    }
});

// Compare two snapshots
router.get('/:id1/diff/:id2', async (req, res) => {
    try {
        const diff = await resticService.diff(req.params.id1, req.params.id2);
        res.json(diff);
    } catch (error) {
        res.status(500).json({ error: 'Failed to compare snapshots', details: error.message });
    }
});

// Delete a snapshot (operator or admin only)
router.delete('/:id', operatorOrAdmin, async (req, res) => {
    try {
        const { prune = false } = req.query;
        await resticService.forgetSnapshot(req.params.id, prune === 'true');
        res.json({ message: 'Snapshot deleted', pruned: prune === 'true' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete snapshot', details: error.message });
    }
});

module.exports = router;

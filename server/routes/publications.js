/**
 * GET  /api/publications        — all groups+newspapers (public)
 * PATCH /api/newspapers/:id     — update a newspaper's rates (admin)
 * POST  /api/newspapers         — add a newspaper (admin)
 * DELETE /api/newspapers/:id    — delete a newspaper (admin)
 * PATCH /api/publication-groups/:id — update group name/email (admin)
 */
const router = require('express').Router();
const db = require('../db');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

// ── Public: get all active publications structured like CONFIG.PUBLICATIONS ──
router.get('/', async (req, res) => {
    try {
        const groups = await db.query(
            `SELECT pg.id, pg.name, pg.contact_email
             FROM publication_groups pg
             WHERE pg.active = true
             ORDER BY pg.sort_order, pg.name`
        );

        const papers = await db.query(
            `SELECT n.*, pg.name AS group_name
             FROM newspapers n
             JOIN publication_groups pg ON pg.id = n.group_id
             WHERE n.active = true AND pg.active = true
             ORDER BY n.sort_order, n.name`
        );

        // Build CONFIG.PUBLICATIONS-compatible structure
        const result = {};
        for (const g of groups.rows) {
            result[g.id] = {
                name: g.name,
                contactEmail: g.contact_email || '',
                newspapers: papers.rows
                    .filter(p => p.group_id === g.id)
                    .map(p => ({
                        id: p.id,
                        name: p.name,
                        language: p.language,
                        bwRate: parseFloat(p.bw_rate),
                        colorRate: parseFloat(p.color_rate),
                        classifiedBase: parseFloat(p.classified_base),
                        classifiedFreeWords: parseInt(p.classified_free_words),
                        classifiedExtraRate: parseFloat(p.classified_extra_rate),
                        isSundayPaper: p.is_sunday_paper,
                        logoUrl: p.logo_url || null,
                        groupName: g.name
                    }))
            };
        }

        res.json(result);
    } catch (err) {
        console.error('GET /api/publications error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Admin: update a newspaper's rates ────────────────────────────────────────
router.patch('/newspapers/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const fields = [];
        const vals = [];
        let i = 1;

        const allowed = {
            name: 'name', language: 'language',
            bwRate: 'bw_rate', colorRate: 'color_rate',
            classifiedBase: 'classified_base',
            classifiedFreeWords: 'classified_free_words',
            classifiedExtraRate: 'classified_extra_rate',
            isSundayPaper: 'is_sunday_paper',
            logoUrl: 'logo_url', active: 'active'
        };

        for (const [jsKey, dbCol] of Object.entries(allowed)) {
            if (d[jsKey] !== undefined) {
                fields.push(`${dbCol} = $${i++}`);
                vals.push(d[jsKey]);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

        fields.push(`updated_at = NOW()`);
        vals.push(req.params.id);

        const result = await db.query(
            `UPDATE newspapers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Newspaper not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin: add a newspaper ────────────────────────────────────────────────────
router.post('/newspapers', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const result = await db.query(
            `INSERT INTO newspapers
               (id, group_id, name, language, bw_rate, color_rate,
                classified_base, classified_free_words, classified_extra_rate,
                is_sunday_paper, logo_url, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
               (SELECT COALESCE(MAX(sort_order),0)+1 FROM newspapers WHERE group_id=$2))
             RETURNING *`,
            [
                d.id || d.name.toLowerCase().replace(/\s+/g, '-'),
                d.groupId, d.name, d.language,
                d.bwRate || 0, d.colorRate || 0,
                d.classifiedBase || 0, d.classifiedFreeWords || 0,
                d.classifiedExtraRate || 0,
                d.isSundayPaper || false,
                d.logoUrl || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Newspaper ID already exists' });
        res.status(500).json({ error: err.message });
    }
});

// ── Admin: delete a newspaper ─────────────────────────────────────────────────
router.delete('/newspapers/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM newspapers WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Newspaper not found' });
        res.json({ deleted: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Admin: update publication group ──────────────────────────────────────────
router.patch('/groups/:id', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const d = req.body;
        const fields = [];
        const vals = [];
        let i = 1;
        if (d.name !== undefined) { fields.push(`name = $${i++}`); vals.push(d.name); }
        if (d.contactEmail !== undefined) { fields.push(`contact_email = $${i++}`); vals.push(d.contactEmail); }
        if (d.active !== undefined) { fields.push(`active = $${i++}`); vals.push(d.active); }
        if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

        fields.push(`updated_at = NOW()`);
        vals.push(req.params.id);
        const result = await db.query(
            `UPDATE publication_groups SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Group not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

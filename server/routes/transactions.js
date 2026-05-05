const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET all transactions (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { category, source, from, to, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (source) filter.source = source;
    if (from || to) {
      filter.paidAt = {};
      if (from) filter.paidAt.$gte = new Date(from);
      if (to) filter.paidAt.$lte = new Date(to);
    }
    const transactions = await Transaction.find(filter)
      .sort({ paidAt: -1 })
      .limit(Number(limit));
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET summary stats
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalThisMonth, totalAllTime, byCategory] = await Promise.all([
      Transaction.aggregate([
        { $match: { paidAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { paidAt: { $gte: startOfMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    res.json({
      thisMonth: totalThisMonth[0] || { total: 0, count: 0 },
      allTime: totalAllTime[0] || { total: 0, count: 0 },
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create transaction
router.post('/', async (req, res) => {
  try {
    const tx = new Transaction(req.body);
    await tx.save();
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST bulk upsert (SMS import — dedupeKey prevents duplicates on re-sync)
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array required' });
    }

    const ops = transactions.map((tx) => ({
      updateOne: {
        filter: { dedupeKey: tx.dedupeKey },
        update: { $setOnInsert: tx },
        upsert: true,
      },
    }));

    const result = await Transaction.bulkWrite(ops, { ordered: false });
    res.status(201).json({ inserted: result.upsertedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST clear all SMS-synced transactions (POST avoids /:id route conflict)
router.post('/clear-sms', async (req, res) => {
  try {
    const result = await Transaction.deleteMany({ source: 'sms' });
    res.json({ deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a single transaction by id
router.delete('/:id', async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

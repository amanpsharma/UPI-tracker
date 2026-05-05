const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    recipient: { type: String, required: true },
    upiId: { type: String, default: '' },
    note: { type: String, default: '' },
    category: {
      type: String,
      enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'],
      default: 'Other',
    },
    source: {
      type: String,
      enum: ['sms', 'manual'],
      default: 'manual',
    },
    transactionId: { type: String, default: '' },
    paidAt: { type: Date, default: Date.now },
    // Unique fingerprint used to deduplicate SMS syncs
    dedupeKey: { type: String, default: '' },
  },
  { timestamps: true }
);

// Sparse so manual transactions (no dedupeKey) are not affected
transactionSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);

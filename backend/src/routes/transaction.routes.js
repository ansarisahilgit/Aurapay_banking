const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const Transaction = require('../models/Transaction');
router.use(auth);
router.get('/', async (req, res, next) => {
  try {
    const rows = await Transaction.find({ $or: [{ sender: req.user._id }, { receiver: req.user._id }] })
      .sort({ createdAt: -1 }).limit(100)
      .populate('sender', 'name accountNumber').populate('receiver', 'name accountNumber');
    res.json({ transactions: rows.map(t => ({
      reference: t.reference, amount: t.amount, currency: t.currency, note: t.note, status: t.status, createdAt: t.createdAt,
      direction: String(t.sender._id) === String(req.user._id) ? 'DEBIT' : 'CREDIT',
      counterparty: String(t.sender._id) === String(req.user._id) ? t.receiver : t.sender
    })) });
  } catch (e) { next(e); }
});
module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const User = require('../models/User');
const Beneficiary = require('../models/Beneficiary');
router.use(auth);
router.get('/', async (req, res, next) => {
  try {
    const rows = await Beneficiary.find({ owner: req.user._id }).populate('beneficiary', 'name email accountNumber');
    res.json({ beneficiaries: rows.map(x => ({ id: x._id, nickname: x.nickname, user: x.beneficiary })) });
  } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    if (!/^\d{12}$/.test(accountNumber)) return res.status(400).json({ message: 'Enter a valid 12-digit account number' });
    const target = await User.findOne({ accountNumber, isActive: true });
    if (!target) return res.status(404).json({ message: 'No active user found for that account number' });
    if (target.id === req.user.id) return res.status(400).json({ message: 'You cannot add your own account' });
    const row = await Beneficiary.create({ owner: req.user._id, beneficiary: target._id, nickname: String(req.body.nickname || '').slice(0, 40) });
    res.status(201).json({ beneficiary: { id: row._id, nickname: row.nickname, user: { name: target.name, email: target.email, accountNumber: target.accountNumber } } });
  } catch (e) { next(e); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Beneficiary.deleteOne({ _id: req.params.id, owner: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Beneficiary not found' });
    res.json({ message: 'Beneficiary removed' });
  } catch (e) { next(e); }
});
module.exports = router;

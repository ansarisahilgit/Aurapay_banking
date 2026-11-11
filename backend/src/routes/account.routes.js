const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
router.use(auth);
router.get('/me', (req, res) => res.json({
  account: { accountNumber: req.user.accountNumber, holderName: req.user.name, balance: req.user.balance, currency: req.user.currency, status: req.user.isActive ? 'ACTIVE' : 'INACTIVE' }
}));
module.exports = router;

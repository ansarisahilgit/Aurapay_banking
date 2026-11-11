const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const auth = require('../middleware/auth.middleware');
const User = require('../models/User');
const Beneficiary = require('../models/Beneficiary');
const Otp = require('../models/Otp');
const Transaction = require('../models/Transaction');
router.use(auth);

router.post('/request-otp', async (req, res, next) => {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    const amount = Number(req.body.amount);
    const note = String(req.body.note || '').trim().slice(0, 120);
    if (!/^\d{12}$/.test(accountNumber)) return res.status(400).json({ message: 'Invalid beneficiary account number' });
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) return res.status(400).json({ message: 'Enter a valid positive amount with up to 2 decimal places' });
    if (amount > 100000) return res.status(400).json({ message: 'Demo transfer limit is ₹1,00,000' });
    const receiver = await User.findOne({ accountNumber, isActive: true });
    if (!receiver || receiver.id === req.user.id) return res.status(404).json({ message: 'Valid recipient account not found' });
    const isBeneficiary = await Beneficiary.exists({ owner: req.user._id, beneficiary: receiver._id });
    if (!isBeneficiary) return res.status(403).json({ message: 'Add this recipient as a beneficiary first' });
    if (req.user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
    await Otp.deleteMany({ user: req.user._id, purpose: 'TRANSFER', consumedAt: null });
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const otp = await Otp.create({ user: req.user._id, purpose: 'TRANSFER', payload: { receiverId: receiver._id.toString(), amount, note }, codeHash, expiresAt: new Date(Date.now() + Number(process.env.OTP_TTL_MINUTES || 5) * 60000) });
    const response = { message: 'OTP generated. It expires in 5 minutes.', otpRequestId: otp._id };
    if (process.env.OTP_DEMO_MODE === 'true') response.demoOtp = code;
    console.log(`Demo OTP for ${req.user.email}: ${code}`);
    res.json(response);
  } catch (e) { next(e); }
});

router.post('/confirm', async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { otpRequestId, otp: code } = req.body;
    if (!otpRequestId || !/^\d{6}$/.test(String(code || ''))) return res.status(400).json({ message: 'OTP request and six-digit code are required' });
    let completed;
    await session.withTransaction(async () => {
      const otp = await Otp.findOne({ _id: otpRequestId, user: req.user._id, purpose: 'TRANSFER', consumedAt: null }).session(session);
      if (!otp || otp.expiresAt < new Date()) throw Object.assign(new Error('OTP is invalid or expired'), { status: 400 });
      if (otp.attempts >= 5) throw Object.assign(new Error('Too many incorrect OTP attempts'), { status: 429 });
      if (!(await bcrypt.compare(String(code), otp.codeHash))) {
        otp.attempts += 1; await otp.save({ session });
        throw Object.assign(new Error('Incorrect OTP'), { status: 400 });
      }
      const sender = await User.findById(req.user._id).session(session);
      const receiver = await User.findById(otp.payload.receiverId).session(session);
      if (!sender || !receiver || !sender.isActive || !receiver.isActive) throw Object.assign(new Error('One of the accounts is unavailable'), { status: 400 });
      const amount = otp.payload.amount;
      if (sender.balance < amount) throw Object.assign(new Error('Insufficient balance'), { status: 400 });
      sender.balance = Math.round((sender.balance - amount) * 100) / 100;
      receiver.balance = Math.round((receiver.balance + amount) * 100) / 100;
      await sender.save({ session }); await receiver.save({ session });
      const reference = `TXN${Date.now()}${crypto.randomInt(1000, 9999)}`;
      const [tx] = await Transaction.create([{
        reference, sender: sender._id, receiver: receiver._id, amount, note: otp.payload.note
      }], { session });
      otp.consumedAt = new Date(); await otp.save({ session });
      completed = { reference: tx.reference, amount, currency: 'INR', receiverName: receiver.name, receiverAccount: receiver.accountNumber, balance: sender.balance, createdAt: tx.createdAt };
    });
    res.json({ message: 'Transfer completed successfully', transaction: completed });
  } catch (e) { next(e); }
  finally { await session.endSession(); }
});
module.exports = router;

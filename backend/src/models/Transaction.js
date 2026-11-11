const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'INR' },
  note: { type: String, maxlength: 120, default: '' },
  status: { type: String, enum: ['SUCCESS'], default: 'SUCCESS' }
}, { timestamps: true });
module.exports = mongoose.model('Transaction', schema);

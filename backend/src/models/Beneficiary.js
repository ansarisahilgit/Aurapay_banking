const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nickname: { type: String, trim: true, maxlength: 40 }
}, { timestamps: true });
schema.index({ owner: 1, beneficiary: 1 }, { unique: true });
module.exports = mongoose.model('Beneficiary', schema);

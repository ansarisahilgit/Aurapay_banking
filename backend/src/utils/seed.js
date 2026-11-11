const bcrypt = require('bcryptjs');
const User = require('../models/User');
module.exports = async function seedDemoUsers() {
  const count = await User.countDocuments();
  if (count) return;
  const hash = await bcrypt.hash('DemoPass123!', 12);
  await User.insertMany([
    { name: 'Alice Demo', email: 'alice@demo.local', passwordHash: hash, accountNumber: '100000000001', balance: 25000 },
    { name: 'Bob Demo', email: 'bob@demo.local', passwordHash: hash, accountNumber: '100000000002', balance: 18000 }
  ]);
  console.log('Demo users created');
};

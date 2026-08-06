const mongoose = require('mongoose');
const { GRADES } = require('../utils/policyRates');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['engineer', 'admin'], default: 'engineer' },
    // Drives conveyance/DA/lodging eligibility per the TA/DA policy sheet.
    grade: { type: String, enum: GRADES, default: 'IE7' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// No fallback on purpose — a missing JWT_SECRET should fail loudly at boot
// (see server.js), not silently sign tokens with a well-known default.
const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { name, employeeId, email, password, grade } = req.body;
    if (!name || !employeeId || !password) {
      return res.status(400).json({ message: 'name, employeeId and password are required' });
    }
    const existing = await User.findOne({ employeeId });
    if (existing) return res.status(409).json({ message: 'Employee ID already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, employeeId, email, passwordHash, grade });

    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ message: 'employeeId and password are required' });
    }

    const user = await User.findOne({
      $or: [{ employeeId }, { email: employeeId }],
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: { id: user._id, name: user.name, employeeId: user.employeeId, role: user.role, grade: user.grade },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import OTP from '../models/OTP';
import { v4 as uuidv4 } from 'uuid';
import { sendOTPEmail } from '../services/emailService';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP for registration
router.post('/register', async (req, res) => {
  const { username, email, password, userType } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const validUserType = userType === 'private' ? 'private' : 'public';

  try {
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).json({ error: 'Username already exists.' });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });

    // Hash password to store temporarily
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate and store OTP (expires in 10 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email,
      otp,
      expiresAt,
      username,
      password: hashedPassword,
      userType: validUserType,
    });

    // Send OTP via email
    await sendOTPEmail(email, otp);

    res.status(200).json({ 
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: email // Return email for frontend to use in verification
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP.' });
  }
});

// Verify OTP and complete registration
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  try {
    // Find the OTP
    const otpRecord = await OTP.findOne({ email, otp });
    
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Get user data from OTP record
    const { username, password: hashedPassword, userType } = otpRecord;

    if (!username || !hashedPassword) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'Registration data expired. Please start over.' });
    }

    // Check if username or email already exists (double check)
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      await OTP.deleteOne({ _id: otpRecord._id });
      if (existingUser.username === username) {
        return res.status(409).json({ error: 'Username already exists.' });
      }
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
    }

    // Create the user
    const uid = uuidv4();
    const user = await User.create({ 
      username, 
      email,
      password: hashedPassword, 
      uid, 
      type: userType || 'public' 
    });

    // Delete the used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({ 
      message: 'Registration successful!',
      username: user.username, 
      uid: user.uid,
      email: user.email,
      type: user.type
    });
  } catch (err: any) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ uid: user.uid, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, username: user.username, uid: user.uid, type: user.type });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Update user type (requires authentication)
router.put('/user-type', async (req, res) => {
  const { uid, userType } = req.body;

  if (!uid || !userType) {
    return res.status(400).json({ error: 'UID and userType are required.' });
  }

  if (userType !== 'public' && userType !== 'private') {
    return res.status(400).json({ error: 'userType must be either "public" or "private".' });
  }

  try {
    const user = await User.findOne({ uid });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    user.type = userType;
    await user.save();

    res.json({ 
      message: 'User type updated successfully.',
      username: user.username,
      uid: user.uid,
      type: user.type
    });
  } catch (err: any) {
    console.error('Update user type error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user type.' });
  }
});

export default router; 
import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string; // bcrypt-hashed OTP
  expiresAt: Date;
  purpose: 'registration' | 'password_reset';
  username?: string;
  password?: string; // bcrypt-hashed password
  userType?: 'public' | 'private';
  attempts: number;  // brute-force guard
}

const OTPSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true }, // stored as bcrypt hash
    expiresAt: { type: Date, required: true },
    purpose: {
      type: String,
      enum: ['registration', 'password_reset'],
      required: true,
      default: 'registration',
    },
    username: { type: String },
    password: { type: String },
    userType: { type: String, enum: ['public', 'private'], default: 'public' },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes documents after expiresAt
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);

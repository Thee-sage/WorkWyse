import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  username?: string;
  password?: string;
  userType?: 'public' | 'private';
}

const OTPSchema: Schema = new Schema<IOTP>({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }, // TTL index - auto delete after expiresAt
  username: { type: String },
  password: { type: String }, // Hashed password stored temporarily
  userType: { type: String, enum: ['public', 'private'], default: 'public' },
}, { timestamps: true });

// Create TTL index to auto-delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);


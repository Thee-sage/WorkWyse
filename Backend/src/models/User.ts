import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  uid: string;
  type: 'public' | 'private';
  role: 'user' | 'admin' | 'moderator';
  isEmailVerified: boolean;  // true only after OTP confirmation
  refreshToken?: string;
  // LinkedIn verification
  linkedinVerified: boolean;
  linkedinId?: string;
  linkedinDisplayName?: string;
  linkedinAvatarUrl?: string;
  linkedinVerifiedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // Stored as lowercase — enforces case-insensitive uniqueness simply and reliably.
    // 'John', 'JOHN', 'john' all become 'john' and hit the same unique constraint.
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    uid: { type: String, required: true, unique: true },
    type: { type: String, enum: ['public', 'private'], required: true, default: 'public' },
    role: { type: String, enum: ['user', 'admin', 'moderator'], required: true, default: 'user' },
    isEmailVerified: { type: Boolean, required: true, default: false },
    refreshToken: { type: String, default: null },
    // LinkedIn verification fields
    linkedinVerified: { type: Boolean, default: false },
    linkedinId: { type: String, sparse: true, unique: true },
    linkedinDisplayName: { type: String },
    linkedinAvatarUrl: { type: String },
    linkedinVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
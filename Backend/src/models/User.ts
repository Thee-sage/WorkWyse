import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  uid: string;
  type: 'public' | 'private'; // Add user type
}

const UserSchema: Schema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  uid: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true }, // Add user type to schema
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 
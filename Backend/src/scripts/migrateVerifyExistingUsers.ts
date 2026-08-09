/**
 * One-time migration: mark all existing users as email-verified.
 *
 * Run once after deploying the isEmailVerified field:
 *   npx ts-node src/scripts/migrateVerifyExistingUsers.ts
 *
 * These accounts were created before the isEmailVerified flag existed,
 * so they already went through OTP registration — we just need to backfill.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User';

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI not set in environment.');
    process.exit(1);
  }

  console.log('🔗  Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅  Connected.\n');

  // Find all users where isEmailVerified is NOT explicitly true
  const result = await User.updateMany(
    { isEmailVerified: { $ne: true } },
    { $set: { isEmailVerified: true } }
  );

  console.log(`✅  Migrated ${result.modifiedCount} user(s) → isEmailVerified: true`);
  console.log(`ℹ️   ${result.matchedCount} user(s) matched the filter.`);

  await mongoose.disconnect();
  console.log('\n🔌  Disconnected. Migration complete.');
}

migrate().catch(err => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});

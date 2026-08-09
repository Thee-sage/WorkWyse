/* eslint-disable @typescript-eslint/no-unused-vars */

// Module augmentation for Express Request — adds typed user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      uid: string;
      username: string;
      role: 'user' | 'admin' | 'moderator';
      isEmailVerified: boolean;
    };
  }
}

export {};

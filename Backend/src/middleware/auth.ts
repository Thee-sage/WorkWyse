import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/User';

// Demo middleware: attaches a user to req.user based on a query param, header, or default
export function attachUser(req: Request, res: Response, next: NextFunction) {
  // Example: use ?userType=public or ?userType=private
  const userType = (req.query.userType as string) || req.header('x-user-type') || 'public';
  // In real app, fetch user from DB or session
  req.user = {
    username: 'demo',
    password: '',
    uid: 'demo-uid',
    type: userType === 'private' ? 'private' : 'public',
  };
  next();
} 
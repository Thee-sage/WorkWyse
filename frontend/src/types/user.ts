export interface User {
  username: string;
  uid: string;
  token?: string;
  type: 'public' | 'private'; // Add user type
} 
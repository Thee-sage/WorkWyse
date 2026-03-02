"use client";
import { useAuth } from '../AuthContext';
import styles from './style.module.css';

export default function AuthContextExample() {
  const { user, logout } = useAuth();

  if (!user) return <div className={styles.notLoggedIn}>Not logged in.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.username}>Logged in as: {user.username}</div>
      <div className={styles.uid}>UID: {user.uid}</div>
      <button
        className={styles.logoutButton}
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}


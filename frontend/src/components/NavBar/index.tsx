"use client";
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/Toast';
import styles from './style.module.css';
import NotificationBell from '../NotificationBell';

export default function NavBar() {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (loading) return null; // Don't flash nav before auth is resolved

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.link}>Home</Link>
        {!user && <Link href="/login" className={styles.link}>Login</Link>}
        {!user && <Link href="/register" className={styles.link}>Register</Link>}
        {user && <Link href="/settings" className={styles.link}>Settings</Link>}
        {user && (isAdmin || user.role === 'moderator') && (
          <Link href="/dashboard" className={styles.link} style={{ color: '#a78bfa' }}>Dashboard</Link>
        )}
        {user && isAdmin && <Link href="/admin" className={styles.link} style={{ color: 'var(--accent)' }}>Admin</Link>}
        {user && <span className={styles.userInfo}>Logged in as {user.username}</span>}
        {user && <NotificationBell />}
        {user && <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>}
      </div>
    </nav>
  );
}

"use client";
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import styles from './style.module.css';

export default function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.link}>Home</Link>
        {!user && <Link href="/login" className={styles.link}>Login</Link>}
        {!user && <Link href="/register" className={styles.link}>Register</Link>}
        {user && <Link href="/settings" className={styles.link}>Settings</Link>}
        {user && <span className={styles.userInfo}>Logged in as {user.username}</span>}
        {user && <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>}
      </div>
    </nav>
  );
}


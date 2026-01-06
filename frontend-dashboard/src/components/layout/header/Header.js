import Link from 'next/link';
import styles from './Header.module.css';

export default function Header() {
    return (
        <header className={styles.header}>
            <Link href="/dashboard" className={styles.logo}>WhatsApp Orders 🤖</Link>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <Link href="/configuracoes" style={{ fontSize: '0.9rem', color: '#4b5563', textDecoration: 'underline' }}>
                    Configurações
                </Link>
                <div className={styles.user}>Admin</div>
            </div>
        </header>
    );
}

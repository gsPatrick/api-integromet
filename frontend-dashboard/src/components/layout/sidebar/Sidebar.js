'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Radio, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: '/dashboard', label: 'Pedidos', icon: LayoutDashboard },
        { href: '/historico', label: 'Histórico Live', icon: Radio },
        { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ];

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        router.push('/login');
    };

    return (
        <aside style={{
            width: '260px',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'white',
            borderRight: '1px solid #e4e4e7',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px'
        }}>
            {/* Logo */}
            <div style={{
                padding: '8px 12px',
                marginBottom: '32px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.25rem'
                    }}>
                        C
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: '#0a0a0a' }}>Coletivino</div>
                        <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Gestão de Pedidos</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', padding: '0 12px' }}>
                    Menu
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.href}>
                                <Link href={item.href} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    color: isActive ? '#2563eb' : '#52525b',
                                    background: isActive ? '#eff6ff' : 'transparent',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.15s'
                                }}>
                                    <Icon size={20} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '16px' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '10px',
                        color: '#71717a',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.15s'
                    }}
                >
                    <LogOut size={20} />
                    Sair
                </button>
            </div>
        </aside>
    );
}

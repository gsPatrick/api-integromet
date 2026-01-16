'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Radio, Settings, LogOut, User, BookOpen } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: '/dashboard', label: 'Pedidos', icon: LayoutDashboard },
        { href: '/clientes', label: 'Clientes', icon: User },
        { href: '/catalogo', label: 'Catálogo', icon: BookOpen },
        { href: '/configuracoes/campanhas', label: 'Campanhas', icon: LayoutDashboard }, // Or Calendar/Flag? Using LayoutDashboard for now or import new one maybe?
        { href: '/historico', label: 'Histórico Live', icon: Radio },
        { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ];

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        router.push('/login');
    };

    return (
        <aside style={{
            width: '280px',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'white',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            padding: '32px 24px',
            boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
        }}>
            {/* Logo */}
            <div style={{
                marginBottom: '48px',
                textAlign: 'center'
            }}>
                <div style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    margin: '0 auto 16px',
                    filter: 'drop-shadow(0 8px 16px rgba(255, 159, 67, 0.2))'
                }}>
                    <Image
                        src="/logo.png"
                        alt="Coletivino"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>
                <div style={{
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    color: '#2d3436',
                    letterSpacing: '-0.02em'
                }}>
                    Coletivino
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1 }}>
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#b2bec3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '16px',
                    paddingLeft: '12px'
                }}>
                    Menu Principal
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.href}>
                                <Link href={item.href} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    borderRadius: '16px',
                                    color: isActive ? '#d35400' : '#636e72',
                                    background: isActive ? '#fff3e0' : 'transparent',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '16px',
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: '#d35400'
                                        }} />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '24px' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        color: '#636e72',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#ffeaa7';
                        e.currentTarget.style.color = '#d63031';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#636e72';
                    }}
                >
                    <LogOut size={20} />
                    Sair da Conta
                </button>
            </div>
        </aside>
    );
}

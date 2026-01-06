'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Settings, ExternalLink } from 'lucide-react'; // Needs lucide-react

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Histórico Live', href: '/historico', icon: History },
        { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ];

    return (
        <aside style={{
            width: '250px',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0
        }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🤖</span> AutoZap
                </h1>
            </div>

            <nav style={{ padding: '24px 12px', flex: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        color: isActive ? '#4f46e5' : '#64748b',
                                        backgroundColor: isActive ? '#eef2ff' : 'transparent',
                                        fontWeight: isActive ? 600 : 500,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Icon size={20} />
                                    {item.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        A
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Online</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

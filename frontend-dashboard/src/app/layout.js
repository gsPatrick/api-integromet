'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import Sidebar from '../components/layout/sidebar/Sidebar';

export default function RootLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    // Login page gets full screen without sidebar
    if (isLoginPage) {
        return (
            <html lang="pt-BR">
                <body>
                    {children}
                </body>
            </html>
        );
    }

    // All other pages get sidebar layout
    return (
        <html lang="pt-BR">
            <body>
                <div style={{ display: 'flex', minHeight: '100vh' }}>
                    <div style={{ width: '260px', flexShrink: 0 }}>
                        <Sidebar />
                    </div>
                    <main style={{ flex: 1, padding: '32px', backgroundColor: '#fafafa', overflowX: 'hidden' }}>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}

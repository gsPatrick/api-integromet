import './globals.css';
import Sidebar from '../components/layout/sidebar/Sidebar';

export const metadata = {
    title: 'AutoZap Dashboard',
    description: 'Gestão de Pedidos WhatsApp',
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body>
                <div style={{ display: 'flex', minHeight: '100vh' }}>
                    {/* Sidebar Area */}
                    <div style={{ width: '250px', flexShrink: 0 }}>
                        <Sidebar />
                    </div>

                    {/* Main Content Area */}
                    <main style={{ flex: 1, padding: '32px', backgroundColor: '#f8fafc', overflowX: 'hidden' }}>
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}

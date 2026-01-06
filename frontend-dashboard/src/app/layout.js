import './globals.css';
import Header from '../components/layout/header/Header';

export const metadata = {
    title: 'WhatsApp Order Dashboard',
    description: 'Manage your automated orders',
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body>
                <Header />
                <main>{children}</main>
            </body>
        </html>
    );
}

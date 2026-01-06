'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, ShoppingBag } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);

        // Simple auth for now
        setTimeout(() => {
            if (username === 'admin' && password === 'admin') {
                localStorage.setItem('isLoggedIn', 'true');
                router.push('/dashboard');
            } else {
                alert('Credenciais inválidas. Use admin/admin');
            }
            setLoading(false);
        }, 500);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
        }}>
            {/* Left Side - Branding */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '48px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Abstract Background Elements */}
                <div style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%)',
                    top: '20%',
                    left: '10%',
                    filter: 'blur(60px)'
                }} />
                <div style={{
                    position: 'absolute',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                    bottom: '20%',
                    right: '20%',
                    filter: 'blur(40px)'
                }} />

                <div style={{ position: 'relative', textAlign: 'center', maxWidth: '400px' }}>
                    {/* Logo */}
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 32px',
                        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.3)'
                    }}>
                        <ShoppingBag size={40} color="white" />
                    </div>

                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '16px',
                        letterSpacing: '-0.02em'
                    }}>
                        Coletivino
                    </h1>

                    <p style={{
                        fontSize: '1.125rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        lineHeight: 1.6,
                        marginBottom: '32px'
                    }}>
                        Sistema inteligente de gestão de pedidos via WhatsApp com extração automática por IA
                    </p>

                    {/* Features */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        {['Extração automática de pedidos', 'Integração Bling ERP', 'Dashboard em tempo real'].map((feature, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '0.875rem'
                            }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: 'rgba(37, 99, 235, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Sparkles size={14} color="#3b82f6" />
                                </div>
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                padding: '48px'
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <h2 style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#0a0a0a',
                        marginBottom: '8px'
                    }}>
                        Bem-vindo de volta
                    </h2>
                    <p style={{
                        color: '#71717a',
                        marginBottom: '32px'
                    }}>
                        Entre com suas credenciais para acessar o painel
                    </p>

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#3f3f46',
                                marginBottom: '8px'
                            }}>
                                Usuário
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                className="input"
                                style={{ fontSize: '1rem', padding: '14px 16px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#3f3f46',
                                marginBottom: '8px'
                            }}>
                                Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input"
                                style={{ fontSize: '1rem', padding: '14px 16px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: 'white',
                                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Entrar
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p style={{
                        textAlign: 'center',
                        marginTop: '24px',
                        fontSize: '0.75rem',
                        color: '#a1a1aa'
                    }}>
                        Credenciais padrão: admin / admin
                    </p>
                </div>
            </div>
        </div>
    );
}

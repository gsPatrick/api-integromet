'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            if (username === 'admin' && password === 'admin') {
                localStorage.setItem('isLoggedIn', 'true');
                router.push('/dashboard');
            } else {
                alert('Credenciais inválidas. Use admin/admin');
            }
            setLoading(false);
        }, 800);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'white'
        }}>
            {/* Left Side - Brand & Gradient */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '48px',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 50%, #feca57 100%)'
            }}>
                {/* Glass Pattern Overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.1,
                    backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)',
                    backgroundSize: '32px 32px'
                }} />

                {/* Floating Orbs */}
                <div style={{
                    position: 'absolute',
                    width: '400px',
                    height: '400px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                    top: '10%',
                    left: '10%',
                    filter: 'blur(40px)',
                    animation: 'float 8s ease-in-out infinite'
                }} />

                <div style={{
                    position: 'relative',
                    textAlign: 'center',
                    maxWidth: '480px',
                    padding: '40px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '32px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Logo Image */}
                    <div style={{
                        width: '140px',
                        height: '140px',
                        margin: '0 auto 24px',
                        position: 'relative',
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                    }}>
                        <Image
                            src="/logo.png"
                            alt="Coletivino Logo"
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>

                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        color: 'white',
                        marginBottom: '16px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        Coletivino
                    </h1>

                    <p style={{
                        fontSize: '1.25rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: 1.6,
                        fontWeight: 500
                    }}>
                        Compras Coletivas Inteligentes
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px',
                background: '#fff'
            }}>
                <div style={{ width: '100%', maxWidth: '420px' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: 800,
                            color: '#2d3436',
                            marginBottom: '12px'
                        }}>
                            Bem-vindo! 👋
                        </h2>
                        <p style={{ color: '#636e72', fontSize: '1.1rem' }}>
                            Entre para gerenciar seus pedidos
                        </p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#2d3436',
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
                                style={{ padding: '16px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                color: '#2d3436',
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
                                style={{ padding: '16px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                color: 'white',
                                background: 'linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%)',
                                border: 'none',
                                borderRadius: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s',
                                boxShadow: '0 10px 20px -5px rgba(255, 107, 107, 0.4)',
                                opacity: loading ? 0.8 : 1
                            }}
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Acessar Painel
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

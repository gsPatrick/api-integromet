'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Settings, Link2, Unlink, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SettingsPage() {
    const [blingConnected, setBlingConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const response = await api.get('/integrations/status');
            setBlingConnected(response.data.blingConnected);
        } catch (error) {
            console.error('Failed to check status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Tem certeza que deseja desconectar do Bling?')) return;
        try {
            setLoading(true);
            await api.delete('/auth/bling/disconnect');
            setBlingConnected(false);
        } catch (error) {
            alert('Erro ao desconectar.');
        } finally {
            setLoading(false);
        }
    };

    const getBlingAuthUrl = () => {
        return `${api.defaults.baseURL}/auth/bling/start`;
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '1.875rem',
                    fontWeight: 700,
                    color: '#0a0a0a',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <Settings size={28} color="#2563eb" />
                    Configurações
                </h1>
                <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                    Gerencie as integrações e preferências do sistema
                </p>
            </div>

            {/* Bling Integration Card */}
            <div className="card" style={{ padding: '24px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        {/* Logo */}
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Link2 size={24} color="white" />
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0a0a0a', marginBottom: '4px' }}>
                                Bling ERP
                            </h2>
                            <p style={{ color: '#71717a', fontSize: '0.875rem', maxWidth: '400px' }}>
                                Sincronize seus pedidos automaticamente com o Bling para gestão completa de vendas.
                            </p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    {!loading && (
                        <span
                            className={blingConnected ? 'badge badge-green' : 'badge badge-yellow'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            {blingConnected ? (
                                <>
                                    <CheckCircle size={12} />
                                    Conectado
                                </>
                            ) : (
                                <>
                                    <XCircle size={12} />
                                    Desconectado
                                </>
                            )}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e4e4e7'
                }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a' }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Verificando...
                        </div>
                    ) : blingConnected ? (
                        <button
                            onClick={handleDisconnect}
                            className="btn btn-secondary"
                            style={{ color: '#ef4444' }}
                        >
                            <Unlink size={16} />
                            Desconectar
                        </button>
                    ) : (
                        <a href={getBlingAuthUrl()} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            <Link2 size={16} />
                            Conectar Bling
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

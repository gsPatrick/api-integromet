'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import styles from './page.module.css';
import { Trash2 } from 'lucide-react';

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
            alert('Desconectado com sucesso!');
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
        <div className={styles.container}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>Configurações</h1>

            {/* BLING CARD */}
            <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Integração Bling</h2>
                    <span className={blingConnected ? 'badge badge-green' : 'badge badge-yellow'}>
                        {blingConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>

                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                    Sincronize seus pedidos automaticamente com o Bling ERP.
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {!loading && !blingConnected && (
                        <a href={getBlingAuthUrl()} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            Conectar Bling
                        </a>
                    )}

                    {!loading && blingConnected && (
                        <button onClick={handleDisconnect} className="btn" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}>
                            <Trash2 size={16} style={{ marginRight: '8px' }} />
                            Desconectar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

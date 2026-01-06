'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api'; // Ensure correct path to API service
import styles from './page.module.css';

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

    const getBlingAuthUrl = () => {
        // Points to Backend Auth Start
        return 'http://localhost:3000/auth/bling/start';
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Configurações</h1>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>Integrações</div>
                </div>

                <div className={styles.section}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>Bling ERP</div>
                        <div className={styles.statusLabel}>
                            Status:
                            {loading ? ' Verificando...' : (
                                blingConnected ?
                                    <span className={styles.connected}> Conectado ✅</span> :
                                    <span className={styles.disconnected}> Desconectado ❌</span>
                            )}
                        </div>
                    </div>

                    {!loading && !blingConnected && (
                        <a href={getBlingAuthUrl()} className={styles.connectButton}>
                            Conectar Bling agora
                        </a>
                    )}

                    {!loading && blingConnected && (
                        <button disabled className={styles.connectButton} style={{ background: '#d1fae5', color: '#065f46', cursor: 'default' }}>
                            Integração Ativa
                        </button>
                    )}
                </div>

                <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '1rem' }}>
                    Ao conectar, o sistema poderá criar pedidos de venda automaticamente no seu Bling.
                </p>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import styles from './page.module.css';
import { Trash2, DownloadCloud, CheckCircle, AlertCircle } from 'lucide-react'; // Needs lucide-react

export default function SettingsPage() {
    const [blingConnected, setBlingConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

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

    const handleImportHistory = async () => {
        try {
            setImporting(true);
            setImportResult(null);
            const response = await api.post('/import/history');

            if (response.data.success) {
                setImportResult({
                    success: true,
                    count: response.data.processed,
                    message: `Sucesso! ${response.data.processed} mensagens processadas.`
                });
            } else {
                setImportResult({ success: false, message: response.data.message || 'Nenhuma mensagem encontrada.' });
            }

        } catch (error) {
            console.error('Import failed', error);
            setImportResult({ success: false, message: 'Erro ao importar mensagens. Verifique os logs.' });
        } finally {
            setImporting(false);
        }
    };

    const getBlingAuthUrl = () => {
        // Use the PRODUCTION backend URL if available, or current host logic
        // Best is to use the direct backend URL if we serve it
        // But for redirect, we can point to the API route
        return `${api.defaults.baseURL}/auth/bling/start`;
    };

    return (
        <div className={styles.container}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>Configurações</h1>

            {/* BLING CARD */}
            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
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

            {/* TOOLS CARD */}
            <div className="card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Ferramentas de Teste</h2>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Importar Histórico de Hoje</h3>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>
                        Processa mensagens antigas do grupo configurado (HOJE) como se fossem novos pedidos. Útil para testes.
                    </p>

                    <button
                        onClick={handleImportHistory}
                        disabled={importing}
                        className="btn btn-primary"
                    >
                        {importing ? 'Processando...' : (
                            <>
                                <DownloadCloud size={16} /> Importar Mensagens
                            </>
                        )}
                    </button>

                    {importResult && (
                        <div style={{ marginTop: '16px', fontSize: '0.875rem', padding: '12px', borderRadius: '6px', background: importResult.success ? '#f0fdf4' : '#fef2f2', color: importResult.success ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {importResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {importResult.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

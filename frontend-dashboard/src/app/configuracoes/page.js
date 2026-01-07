'use client';

import { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, Link2, Unlink, Loader2, Save, ShoppingBag, Percent } from 'lucide-react';
import api from '../../services/api';

export default function ConfigPage() {
    const [status, setStatus] = useState({ connected: false, message: 'Verificando...' });
    const [settings, setSettings] = useState({
        markup_percentage: 35,
        group_orders: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        checkStatus();
        fetchSettings();
    }, []);

    const checkStatus = async () => {
        // Mock check (replace with real one if available)
        setStatus({ connected: false, message: 'Não verificado' });
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            // Ensure values are correct types
            setSettings({
                markup_percentage: Number(res.data.markup_percentage || 35),
                group_orders: res.data.group_orders === true || res.data.group_orders === 'true'
            });
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await api.put('/settings', settings);
            alert('Configurações salvas!');
        } catch (error) {
            alert('Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const connectBling = () => {
        // Redirect to Backend to handle OAuth securely
        window.location.href = `${api.defaults.baseURL}/auth/bling/start`;
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Settings size={28} color="#ff9f43" />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Configurações</h1>
                    <p style={{ color: '#636e72' }}>Gerencie suas integrações e preferências</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                {/* BLING CARD */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link2 size={24} color="#ff9f43" />
                            <h2 style={{ fontSize: '1.25rem' }}>Integração Bling</h2>
                        </div>
                        {status.connected ? (
                            <span className="badge badge-green">
                                <CheckCircle size={12} /> Conectado
                            </span>
                        ) : (
                            <span className="badge badge-gray">
                                <Unlink size={12} /> Desconectado
                            </span>
                        )}
                    </div>

                    <p style={{ color: '#636e72', marginBottom: '24px', lineHeight: 1.6 }}>
                        Conecte sua conta do Bling para sincronizar pedidos e clientes automaticamente.
                    </p>

                    <button
                        onClick={connectBling}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Conectar Bling'}
                    </button>
                </div>

                {/* SYSTEM PREFERENCES (NEW) */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShoppingBag size={24} color="#0abde3" />
                            <h2 style={{ fontSize: '1.25rem' }}>Preferências de Pedido</h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Markup Input */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#2d3436' }}>
                                Markup Padrão (%)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Percent size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#636e72' }} />
                                <input
                                    type="number"
                                    className="input"
                                    style={{ paddingLeft: '40px' }}
                                    value={settings.markup_percentage}
                                    onChange={(e) => setSettings({ ...settings, markup_percentage: e.target.value })}
                                    placeholder="35"
                                />
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#b2bec3', marginTop: '6px' }}>
                                Margem de lucro aplicada automaticamente sobre o preço de catálogo da IA.
                            </p>
                        </div>

                        {/* Group Orders Toggle */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <input
                                type="checkbox"
                                id="groupOrders"
                                checked={settings.group_orders}
                                onChange={(e) => setSettings({ ...settings, group_orders: e.target.checked })}
                                style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#ff9f43', cursor: 'pointer' }}
                            />
                            <div>
                                <label htmlFor="groupOrders" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2d3436', cursor: 'pointer' }}>
                                    Agrupar Pedidos do Mesmo Cliente
                                </label>
                                <p style={{ fontSize: '0.75rem', color: '#636e72', marginTop: '4px', lineHeight: 1.4 }}>
                                    Ao sincronizar, o sistema buscará outros pedidos pendentes do mesmo número de WhatsApp e criará um único pedido no Bling com vários itens.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '8px' }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <Save size={18} />
                                    Salvar Preferências
                                </>
                            )}
                        </button>

                    </div>
                </div>

            </div>
        </div>
    );
}

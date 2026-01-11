'use client';

import { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, Link2, Unlink, Loader2, Save, ShoppingBag, Percent, CreditCard, Key, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export default function ConfigPage() {
    const [status, setStatus] = useState({ connected: false, message: 'Verificando...' });
    const [settings, setSettings] = useState({
        markup_percentage: 35,
        group_orders: false,
        campaign_description: '',
        asaas_api_key: '',
        bling_id_status_paid: 'Atendido'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        checkStatus();
        fetchSettings();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await api.get('/integrations/status');
            setStatus({
                connected: res.data.blingConnected,
                message: res.data.blingConnected ? 'Conectado' : 'Desconectado'
            });
        } catch (error) {
            console.error('Failed to check integration status:', error);
            setStatus({ connected: false, message: 'Erro ao verificar' });
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/settings');
            // Ensure values are correct types
            setSettings(prev => ({
                ...prev,
                ...res.data, // Merge with defaults
                markup_percentage: Number(res.data.markup_percentage ?? 35),
                group_orders: res.data.group_orders === true || res.data.group_orders === 'true',
                campaign_description: res.data.campaign_description || '',
                asaas_api_key: res.data.asaas_api_key || '',
                bling_id_status_paid: res.data.bling_id_status_paid || 'Atendido'
            }));
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            // Send payload exactly as expected by backend
            const payload = {
                markup_percentage: settings.markup_percentage,
                group_orders: settings.group_orders,
                campaign_description: settings.campaign_description,
                asaas_api_key: settings.asaas_api_key,
                bling_id_status_paid: settings.bling_id_status_paid
            };

            await api.put('/settings', payload);
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Save settings error:', error);
            alert('Erro ao salvar: ' + (error.response?.data?.error || error.message));
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

                {/* ASAAS CARD (Payment Integration) */}
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CreditCard size={24} color="#10b981" />
                            <h2 style={{ fontSize: '1.25rem' }}>Asaas (Pagamentos)</h2>
                        </div>
                        {settings.asaas_api_key ? (
                            <span className="badge badge-green">
                                <CheckCircle size={12} /> Configurado
                            </span>
                        ) : (
                            <span className="badge badge-gray">
                                <XCircle size={12} /> Não Configurado
                            </span>
                        )}
                    </div>

                    <p style={{ color: '#636e72', marginBottom: '24px', lineHeight: 1.6 }}>
                        Configure a integração com o Asaas para gerar links de pagamento automáticos.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* API Key Input */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#2d3436' }}>
                                API Key do Asaas
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#636e72' }} />
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    className="input"
                                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                    value={settings.asaas_api_key}
                                    onChange={(e) => setSettings({ ...settings, asaas_api_key: e.target.value })}
                                    placeholder="$aact_..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#636e72'
                                    }}
                                >
                                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#b2bec3', marginTop: '6px' }}>
                                Encontre em: Asaas → Minha Conta → Integrações → API Key
                            </p>
                        </div>

                        {/* Bling Status Input */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#2d3436' }}>
                                Status "Pago" no Bling
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={settings.bling_id_status_paid}
                                onChange={(e) => setSettings({ ...settings, bling_id_status_paid: e.target.value })}
                                placeholder="Atendido"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#b2bec3', marginTop: '6px' }}>
                                Nome da situação no Bling quando o pedido é pago (ex: "Atendido", "Em aberto")
                            </p>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '8px', background: '#10b981' }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <Save size={18} />
                                    Salvar Configurações Asaas
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* SYSTEM PREFERENCES */}
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
                                    onChange={(e) => setSettings({ ...settings, markup_percentage: Number(e.target.value) || 0 })}
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

                        {/* Campaign Description */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: '#2d3436' }}>
                                Descrição da Campanha
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={settings.campaign_description}
                                onChange={(e) => setSettings({ ...settings, campaign_description: e.target.value })}
                                placeholder="Ex: Verdi Jan 26"
                            />
                            <p style={{ fontSize: '0.75rem', color: '#b2bec3', marginTop: '6px' }}>
                                Texto que será adicionado à descrição dos produtos no Bling para identificar a campanha.
                            </p>
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

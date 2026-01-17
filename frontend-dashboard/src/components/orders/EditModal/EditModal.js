import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '../../../services/api';
import { X, Save, Check, Sparkles, MessageCircle, User, Calculator, ArrowRight, DollarSign } from 'lucide-react';
import BlingClientModal from '../BlingClientModal/BlingClientModal';

const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_URL}${imageUrl}`;
};

export default function EditModal({ order, onClose, onSave }) {
    const [formData, setFormData] = useState({
        productRaw: order.productRaw || '',
        extractedSize: order.extractedSize || '',
        extractedColor: order.extractedColor || '',
        extractedColorCode: order.extractedColorCode || '',
        sellPrice: order.sellPrice || '',
        quantity: order.quantity || 1,
    });

    const [loading, setLoading] = useState(false);
    const imageUrl = getImageUrl(order.imageUrl);
    const catalogPrice = Number(order.catalogPrice || 0);
    const sellPrice = Number(formData.sellPrice || 0);
    const markup = catalogPrice > 0 ? ((sellPrice - catalogPrice) / catalogPrice * 100).toFixed(1) : 0;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [showBlingClientModal, setShowBlingClientModal] = useState(false);
    const [pendingSync, setPendingSync] = useState(false);

    const handleSave = async (sync = false) => {
        setLoading(true);
        try {
            // First save the order data
            await api.put(`/orders/${order.id}`, formData);

            if (sync) {
                // Check if client mapping already exists
                const mappingRes = await api.get(`/bling/clients/mapping/${order.customerPhone}`);

                if (mappingRes.data.found) {
                    // Mapping exists - sync directly
                    await api.post(`/orders/${order.id}/sync-bling`);
                    alert(`Pedido sincronizado com cliente: ${mappingRes.data.mapping.blingClientName}`);
                    onSave();
                } else {
                    // No mapping - show client confirmation modal
                    setPendingSync(true);
                    setShowBlingClientModal(true);
                    setLoading(false);
                    return;
                }
            } else {
                alert('Dados salvos localmente!');
                onSave();
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    // Called after client is confirmed in the modal
    const handleBlingClientConfirmed = async (client) => {
        setShowBlingClientModal(false);
        setLoading(true);
        try {
            await api.post(`/orders/${order.id}/sync-bling`);
            alert(`Pedido sincronizado com cliente: ${client.nome}`);
            onSave();
        } catch (error) {
            console.error('Error syncing:', error);
            alert('Erro ao sincronizar. Verifique o console.');
        } finally {
            setLoading(false);
            setPendingSync(false);
        }
    };

    // Called if user wants to create a new client instead
    const handleCreateNewClient = async () => {
        setShowBlingClientModal(false);
        setLoading(true);
        try {
            await api.post(`/orders/${order.id}/sync-bling`);
            alert('Pedido sincronizado! Novo cliente criado no Bling.');
            onSave();
        } catch (error) {
            console.error('Error syncing:', error);
            alert('Erro ao sincronizar. Verifique o console.');
        } finally {
            setLoading(false);
            setPendingSync(false);
        }
    };

    const [campaigns, setCampaigns] = useState([])
    const [showCampaignSelect, setShowCampaignSelect] = useState(false);

    // Fetch campaigns on mount
    useEffect(() => {
        api.get('/campaigns').then(res => setCampaigns(res.data.filter(c => c.isActive))).catch(console.error);
    }, []);

    const handleMoveCampaign = async (newCampaignId) => {
        if (!newCampaignId) return;
        if (!confirm('Deseja mover este pedido para outra campanha?')) return;
        setLoading(true);
        try {
            await api.put('/orders/move', { orderIds: [order.id], targetCampaignId: newCampaignId });
            alert('Pedido movido com sucesso!');
            onSave(); // Reload parent
        } catch (error) {
            console.error(error);
            alert('Erro ao mover pedido: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-content animate-slideUp"
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '1000px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                    {/* Header with Title */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                background: '#fff3e0',
                                color: '#ff9f43',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2d3436', margin: 0 }}>
                                    Editar Pedido #{order.id}
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#636e72', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={12} /> {order.customerName} • {order.customerPhone}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="btn-ghost" style={{ padding: '8px' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', height: '600px' }}>

                        {/* LEFT PANEL: WhatsApp Simulation */}
                        <div style={{
                            width: '380px',
                            background: '#e5ddd5',
                            borderRight: '1px solid #d1d5db',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}>
                            {/* WhatsApp Header */}
                            <div style={{
                                background: '#075e54',
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: 'white'
                            }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ccc', overflow: 'hidden' }}>
                                    <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                        <User size={20} />
                                    </div>
                                </div>
                                <div style={{ lineHeight: 1.2 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{order.customerName || 'Cliente'}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>visto por último hoje à(s) {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>

                            {/* WhatsApp Background Pattern */}
                            <div style={{
                                flex: 1,
                                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                                opacity: 0.4,
                                position: 'absolute',
                                inset: 0,
                                zIndex: 0,
                                top: '52px' // Height of header
                            }} />

                            {/* Messages Area */}
                            <div style={{
                                flex: 1,
                                padding: '20px',
                                overflowY: 'auto',
                                position: 'relative',
                                zIndex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                {/* The Message Bubble */}
                                <div style={{
                                    alignSelf: 'flex-start',
                                    maxWidth: '85%',
                                    background: 'white',
                                    borderRadius: '0 8px 8px 8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    padding: '4px',
                                    position: 'relative'
                                }}>
                                    {/* Triangle arrow */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-8px',
                                        top: '0',
                                        width: '0',
                                        height: '0',
                                        borderTop: '0 solid transparent',
                                        borderRight: '12px solid white',
                                        borderBottom: '12px solid transparent'
                                    }} />

                                    <div style={{ padding: '4px' }}>
                                        {/* Image inside bubble if exists (Like WhatsApp Image Message) */}
                                        {imageUrl && (
                                            <div style={{
                                                marginBottom: '6px',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                position: 'relative',
                                                paddingTop: '100%', // 1:1 Aspect Ratio box
                                                background: '#f0f0f0'
                                            }}>
                                                <Image
                                                    src={imageUrl}
                                                    alt="Enviado"
                                                    fill
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            </div>
                                        )}

                                        {/* Text Caption */}
                                        {order.originalMessage && (
                                            <div style={{
                                                padding: '0 4px 4px 4px',
                                                fontSize: '0.95rem',
                                                color: '#111',
                                                lineHeight: 1.4,
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {order.originalMessage}
                                            </div>
                                        )}
                                    </div>

                                    {/* Metadata inside bubble */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center',
                                        gap: '4px',
                                        paddingRight: '6px',
                                        paddingBottom: '4px',
                                        marginTop: '-4px'
                                    }}>
                                        <span style={{ fontSize: '0.65rem', color: '#999' }}>
                                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CENTER & RIGHT: Info and Form */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>

                            <div style={{ padding: '24px', display: 'flex', gap: '24px', flexDirection: 'column' }}>

                                {/* Campaign Transfer Section (NEW) */}
                                <div className="card" style={{ padding: '16px 20px', border: '1px solid #e0e0e0', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <ArrowRight size={20} color="#f57c00" />
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f57c00', textTransform: 'uppercase' }}>Campanha Atual</div>
                                            {showCampaignSelect ? (
                                                <select
                                                    autoFocus
                                                    onChange={(e) => handleMoveCampaign(e.target.value)}
                                                    onBlur={() => setShowCampaignSelect(false)}
                                                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid #f57c00', marginTop: '4px' }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    {campaigns.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name?.split(' ou ')[0] || c.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#333' }}>
                                                    {(campaigns.find(c => c.id === order.campaignId)?.name || 'Desconhecida/Inativa').split(' ou ')[0]} <span style={{ fontSize: '0.8rem', color: '#888' }}>(ID: {order.campaignId})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!showCampaignSelect && (
                                        <button
                                            onClick={() => setShowCampaignSelect(true)}
                                            style={{ padding: '6px 12px', background: 'white', border: '1px solid #f57c00', color: '#f57c00', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            Mover
                                        </button>
                                    )}
                                </div>


                                {/* Financial Info Card */}
                                <div className="card" style={{ padding: '20px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#64748b' }}>
                                        <Calculator size={18} />
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                            Dados Financeiros (IA)
                                        </h3>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Preço Catálogo (IA)</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>
                                                R$ {catalogPrice.toFixed(2)}
                                            </div>
                                        </div>

                                        <ArrowRight size={20} color="#94a3b8" />

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Markup Aplicado</div>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                background: '#dbeafe',
                                                color: '#1e40af',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontWeight: 600
                                            }}>
                                                {markup}%
                                            </div>
                                        </div>

                                        <ArrowRight size={20} color="#94a3b8" />

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Preço Venda</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                                                R$ {sellPrice.toFixed(2)}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Editing Form */}
                                <div className="card" style={{ padding: '20px', border: '1px solid #e2e8f0', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#64748b' }}>
                                        <Sparkles size={18} />
                                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                            Edição dos Dados
                                        </h3>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                Produto
                                            </label>
                                            <input
                                                name="productRaw"
                                                value={formData.productRaw}
                                                onChange={handleChange}
                                                className="input"
                                                placeholder="Nome do produto..."
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                    Tamanho
                                                </label>
                                                <input
                                                    name="extractedSize"
                                                    value={formData.extractedSize}
                                                    onChange={handleChange}
                                                    className="input"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                    Cor
                                                </label>
                                                <input
                                                    name="extractedColor"
                                                    value={formData.extractedColor}
                                                    onChange={handleChange}
                                                    className="input"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                    Cód. Cor
                                                </label>
                                                <input
                                                    name="extractedColorCode"
                                                    value={formData.extractedColorCode}
                                                    onChange={handleChange}
                                                    className="input"
                                                    placeholder="Ex: 120722"
                                                />
                                            </div>
                                        </div>



                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                    Quantidade
                                                </label>
                                                <input
                                                    name="quantity"
                                                    type="number"
                                                    value={formData.quantity}
                                                    onChange={handleChange}
                                                    className="input"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                                    Preço Final (R$)
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <DollarSign size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                                    <input
                                                        name="sellPrice"
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.sellPrice}
                                                        onChange={handleChange}
                                                        className="input"
                                                        style={{ paddingLeft: '32px', fontWeight: 600 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Actions */}
                            <div style={{
                                padding: '20px 24px',
                                background: 'white',
                                borderTop: '1px solid #e5e7eb',
                                display: 'flex',
                                gap: '12px',
                                marginTop: 'auto'
                            }}>
                                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                                    Cancelar
                                </button>
                                <button onClick={() => handleSave(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                    <Save size={18} />
                                    Salvar Rascunho
                                </button>
                                <button onClick={() => handleSave(true)} className="btn btn-primary" style={{ flex: 1 }}>
                                    <Check size={18} />
                                    {loading ? 'Enviando...' : 'Sincronizar Bling'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Bling Client Confirmation Modal */}
            {showBlingClientModal && (
                <BlingClientModal
                    customerPhone={order.customerPhone}
                    customerName={order.customerName}
                    onConfirm={handleBlingClientConfirmed}
                    onClose={() => {
                        setShowBlingClientModal(false);
                        setPendingSync(false);
                    }}
                    onCreateNew={handleCreateNewClient}
                />
            )}
        </>
    );
}

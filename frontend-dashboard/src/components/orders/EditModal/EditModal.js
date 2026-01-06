import { useState } from 'react';
import Image from 'next/image';
import api from '../../../services/api';
import { X, Save, Check, Sparkles, MessageCircle, User } from 'lucide-react';

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
        sellPrice: order.sellPrice || '',
    });

    const [loading, setLoading] = useState(false);
    const imageUrl = getImageUrl(order.imageUrl);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (sync = false) => {
        setLoading(true);
        try {
            await api.put(`/orders/${order.id}`, formData);
            if (sync) {
                await api.post(`/orders/${order.id}/sync-bling`);
                alert('Pedido salvo e enviado para o Bling!');
            } else {
                alert('Dados salvos localmente!');
            }
            onSave();
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content animate-slideUp"
                onClick={(e) => e.stopPropagation()}
                style={{ width: '900px', padding: 0, overflow: 'hidden' }}
            >
                <div style={{ display: 'flex' }}>
                    {/* Left: Image + Chat */}
                    <div style={{
                        width: '400px',
                        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        {/* Product Image */}
                        <div style={{
                            position: 'relative',
                            height: '280px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: '#27272a'
                        }}>
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt="Produto"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: '#71717a'
                                }}>
                                    Sem imagem
                                </div>
                            )}
                        </div>

                        {/* WhatsApp Chat Simulation */}
                        <div style={{
                            background: '#1a1a1a',
                            borderRadius: '12px',
                            padding: '16px',
                            flex: 1
                        }}>
                            <div style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#22c55e',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <MessageCircle size={14} />
                                Mensagem Original
                            </div>

                            {/* Message Bubble */}
                            <div style={{
                                background: '#dcf8c6',
                                padding: '10px 14px',
                                borderRadius: '8px 8px 0 8px',
                                maxWidth: '90%',
                                marginLeft: 'auto'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#128c7e',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <User size={12} />
                                    {order.customerName || 'Cliente'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#111' }}>
                                    {order.originalMessage || '(Mensagem não disponível)'}
                                </div>
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: '#667781',
                                    textAlign: 'right',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '4px'
                                }}>
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <Check size={14} color="#53bdeb" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div style={{ flex: 1, padding: '32px', background: 'white' }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '24px'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0a0a0a', marginBottom: '4px' }}>
                                    Pedido #{order.id}
                                </h2>
                                <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                                    {order.customerPhone}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid #e4e4e7',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={16} color="#71717a" />
                            </button>
                        </div>

                        {/* AI Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            marginBottom: '24px'
                        }}>
                            <Sparkles size={14} />
                            Extraído por IA
                        </div>

                        {/* Form Fields */}
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
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                        Quantidade
                                    </label>
                                    <input
                                        value={order.quantity || 1}
                                        disabled
                                        className="input"
                                        style={{ background: '#f4f4f5' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                                        Preço de Venda (R$)
                                    </label>
                                    <input
                                        name="sellPrice"
                                        type="number"
                                        step="0.01"
                                        value={formData.sellPrice}
                                        onChange={handleChange}
                                        className="input"
                                        style={{ fontWeight: 600, fontSize: '1rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '32px',
                            paddingTop: '24px',
                            borderTop: '1px solid #e4e4e7'
                        }}>
                            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }} disabled={loading}>
                                Cancelar
                            </button>
                            <button onClick={() => handleSave(false)} className="btn btn-ghost" disabled={loading}>
                                <Save size={16} />
                                Rascunho
                            </button>
                            <button onClick={() => handleSave(true)} className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                                <Check size={16} />
                                {loading ? 'Enviando...' : 'Sincronizar Bling'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

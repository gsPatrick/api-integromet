import { useState } from 'react';
import Image from 'next/image';
import api from '../../../services/api';
import styles from './EditModal.module.css';

// API Base URL for images
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
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Editar Pedido #{order.id}</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Left: Product Image + WhatsApp Chat */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Product Image */}
                        <div className={styles.imageContainer}>
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt="Produto"
                                    fill
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                                    Sem imagem
                                </div>
                            )}
                        </div>

                        {/* WhatsApp Chat Preview */}
                        <div style={{
                            background: '#e5ddd5',
                            borderRadius: '8px',
                            padding: '12px',
                            backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2NkIBIwEqmOYVQh3pBhWCoEAKXnAgEsLWiDAAAAAElFTkSuQmCC")'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#075e54', marginBottom: '8px' }}>
                                💬 Mensagem Original
                            </div>

                            {/* Message Bubble */}
                            <div style={{
                                background: '#dcf8c6',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                maxWidth: '85%',
                                marginLeft: 'auto',
                                boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#128c7e', marginBottom: '2px' }}>
                                    {order.customerName || 'Cliente'}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#111' }}>
                                    {order.originalMessage || '(Mensagem não disponível)'}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: '#667781', textAlign: 'right', marginTop: '4px' }}>
                                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Produto (IA)</label>
                            <input
                                name="productRaw"
                                value={formData.productRaw}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Tamanho</label>
                                <input
                                    name="extractedSize"
                                    value={formData.extractedSize}
                                    onChange={handleChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Cor</label>
                                <input
                                    name="extractedColor"
                                    value={formData.extractedColor}
                                    onChange={handleChange}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Quantidade</label>
                                <input
                                    value={order.quantity || 1}
                                    disabled
                                    className={styles.input}
                                    style={{ background: '#f3f4f6' }}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Preço de Venda (R$)</label>
                                <input
                                    name="sellPrice"
                                    type="number"
                                    step="0.01"
                                    value={formData.sellPrice}
                                    onChange={handleChange}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button onClick={onClose} className={`${styles.button} ${styles.cancel}`} disabled={loading}>
                                Cancelar
                            </button>
                            <button onClick={() => handleSave(false)} className={`${styles.button} ${styles.save}`} disabled={loading}>
                                Salvar Rascunho
                            </button>
                            <button onClick={() => handleSave(true)} className={`${styles.button} ${styles.sync}`} disabled={loading}>
                                {loading ? 'Enviando...' : '✅ Sincronizar Bling'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

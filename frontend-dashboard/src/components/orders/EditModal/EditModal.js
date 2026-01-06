import { useState } from 'react';
import Image from 'next/image';
import api from '../../../services/api';
import styles from './EditModal.module.css';

export default function EditModal({ order, onClose, onSave }) {
    const [formData, setFormData] = useState({
        productRaw: order.productRaw || '',
        extractedSize: order.extractedSize || '',
        extractedColor: order.extractedColor || '',
        sellPrice: order.sellPrice || '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (sync = false) => {
        setLoading(true);
        try {
            // 1. Update Order
            await api.put(`/orders/${order.id}`, formData);

            // 2. Sync if requested
            if (sync) {
                await api.post(`/orders/${order.id}/sync-bling`);
                alert('Pedido salvo e enviado para o Bling!');
            } else {
                alert('Dados salvos localmente!');
            }

            onSave(); // Refreshes parent
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.content}>
                    {/* Left: Image */}
                    <div className={styles.imageContainer}>
                        {order.imageUrl ? (
                            <Image
                                src={order.imageUrl}
                                alt="Produto"
                                fill
                                style={{ objectFit: 'contain' }}
                            />
                        ) : <p>Sem imagem</p>}
                    </div>

                    {/* Right: Form */}
                    <div className={styles.form}>
                        <h2>Editar Pedido #{order.id}</h2>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Produto</label>
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

                        <div className={styles.actions}>
                            <button onClick={onClose} className={`${styles.button} ${styles.cancel}`} disabled={loading}>
                                Cancelar
                            </button>
                            <button onClick={() => handleSave(false)} className={`${styles.button} ${styles.save}`} disabled={loading} title="Salva apenas no banco de dados local">
                                Salvar Rascunho
                            </button>
                            <button onClick={() => handleSave(true)} className={`${styles.button} ${styles.sync}`} disabled={loading} title="Salva e envia para o Bling">
                                {loading ? 'Enviando...' : '✅ Salvar e Sincronizar Bling'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import Image from 'next/image';
import styles from './OrderCard.module.css';

// API Base URL for images
const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http')) return imageUrl;
    // Otherwise, prefix with API URL
    return `${API_URL}${imageUrl}`;
};

export default function OrderCard({ order, onClick }) {
    const getStatusClass = (status) => {
        switch (status) {
            case 'PROCESSED': return styles.statusProcessed;
            case 'ERROR': return styles.statusError;
            default: return styles.statusPending;
        }
    };

    const imageUrl = getImageUrl(order.imageUrl);

    return (
        <div className={styles.card} onClick={() => onClick(order)}>
            <div className={styles.imageContainer}>
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={order.productRaw || 'Produto'}
                        fill
                        className={styles.image}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        Sem Imagem
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.header}>
                    <div>
                        <div className={styles.customerName}>{order.customerName || 'Cliente Desconhecido'}</div>
                        <div className={styles.customerPhone}>{order.customerPhone}</div>
                    </div>
                    <span className={`${styles.status} ${order.blingSyncedAt ? styles.statusProcessed : getStatusClass(order.status)}`}>
                        {order.blingSyncedAt ? 'Sincronizado no Bling' :
                            order.status === 'ERROR' ? 'Erro' : 'Pendente'}
                    </span>
                </div>

                <div className={styles.details}>
                    <div className={styles.productName}>{order.productRaw || 'Produto não identificado'}</div>
                    <div className={styles.meta}>
                        <span>Tam: {order.extractedSize || '-'}</span>
                        <span>Cor: {order.extractedColor || '-'}</span>
                    </div>
                    <div className={styles.price}>
                        R$ {order.sellPrice ? Number(order.sellPrice).toFixed(2) : '0.00'}
                    </div>
                </div>
            </div>
        </div>
    );
}

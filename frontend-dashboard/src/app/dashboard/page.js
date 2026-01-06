'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard/OrderCard';
import EditModal from '../../components/orders/EditModal/EditModal';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await api.get('/orders');
            // Backend returns { data: [...], total: ... }
            setOrders(response.data.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // alert('Erro ao buscar pedidos. Verifique a conexão com o backend.');
            setOrders([]); // Clear orders on error, no mock data
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Carregando pedidos...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>Pedidos</h1>

            {orders.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>
                    Nenhum pedido encontrado. Aguardando novas mensagens do WhatsApp...
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px'
                }}>
                    {orders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onClick={setSelectedOrder}
                        />
                    ))}
                </div>
            )}

            {selectedOrder && (
                <EditModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onSave={() => { setSelectedOrder(null); fetchOrders(); }}
                />
            )}
        </div>
    );
}

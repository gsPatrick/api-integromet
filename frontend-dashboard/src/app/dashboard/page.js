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
            // MOCK DATA FALLBACK FOR DEMONSTRATION
            setOrders([
                {
                    id: 1,
                    customerName: 'Maria Silva',
                    customerPhone: '5511999999999',
                    productRaw: 'Vestido Florido Verao',
                    extractedSize: 'M',
                    extractedColor: 'Vermelho',
                    sellPrice: 149.90,
                    status: 'PENDING',
                    imageUrl: 'https://storage.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/image.jpeg'
                },
                {
                    id: 2,
                    customerName: 'João Santos',
                    customerPhone: '5511988888888',
                    productRaw: 'Camisa Polo Básica',
                    extractedSize: 'G',
                    extractedColor: 'Azul Marinho',
                    sellPrice: 89.90,
                    status: 'PROCESSED',
                    imageUrl: null
                }
            ]);
            // alert('Erro ao carregar pedidos. Usando DADOS MOCKADOS para visualização.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Carregando pedidos...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Painel de Pedidos (Mock View)</h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {orders.map(order => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onClick={setSelectedOrder}
                    />
                ))}
            </div>

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

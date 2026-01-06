'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard/OrderCard';
import EditModal from '../../components/orders/EditModal/EditModal';
import { Package, RefreshCw, Inbox } from 'lucide-react';

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
            setOrders(response.data.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                color: '#71717a'
            }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px' }}>Carregando pedidos...</span>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '1.875rem',
                        fontWeight: 700,
                        color: '#0a0a0a',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <Package size={28} color="#2563eb" />
                        Pedidos
                    </h1>
                    <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                        Gerencie os pedidos recebidos via WhatsApp
                    </p>
                </div>

                <button
                    onClick={fetchOrders}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <RefreshCw size={16} />
                    Atualizar
                </button>
            </div>

            {/* Orders Grid or Empty State */}
            {orders.length === 0 ? (
                <div className="card" style={{
                    padding: '80px 40px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: '#f4f4f5',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <Inbox size={32} color="#a1a1aa" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                        Nenhum pedido encontrado
                    </h3>
                    <p style={{ color: '#71717a', maxWidth: '300px', margin: '0 auto' }}>
                        Aguardando novas mensagens do WhatsApp para processar pedidos automaticamente.
                    </p>
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

            {/* Edit Modal */}
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

'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard/OrderCard';
import EditModal from '../../components/orders/EditModal/EditModal';
import { Package, RefreshCw, Inbox, User, Phone, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [expandedCustomers, setExpandedCustomers] = useState({}); // { phone: true/false }

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/orders?limit=100'); // Get more orders to group
            // Group By Customer Phone
            const grouped = {};
            response.data.data.forEach(order => {
                const phone = order.customerPhone;
                if (!grouped[phone]) {
                    grouped[phone] = {
                        customerName: order.customerName,
                        customerPhone: order.customerPhone,
                        orders: [],
                        totalValue: 0
                    };
                }
                grouped[phone].orders.push(order);
                grouped[phone].totalValue += parseFloat(order.sellPrice || 0);
            });

            // Convert to array and sort by latest order
            const groupedArray = Object.values(grouped).sort((a, b) => {
                const latestA = new Date(a.orders[0].createdAt);
                const latestB = new Date(b.orders[0].createdAt);
                return latestB - latestA;
            });

            setOrders(groupedArray);

            // Auto-expand all by default
            const initialExpanded = {};
            groupedArray.forEach(g => initialExpanded[g.customerPhone] = true);
            setExpandedCustomers(initialExpanded);

        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (phone) => {
        setExpandedCustomers(prev => ({ ...prev, [phone]: !prev[phone] }));
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#71717a' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px' }}>Carregando pedidos...</span>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#0a0a0a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Package size={28} color="#e58e26" />
                        Pedidos
                    </h1>
                    <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                        Gerencie os pedidos agrupados por cliente
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

            {/* Orders Groups or Empty State */}
            {orders.length === 0 ? (
                <div className="card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: '#f4f4f5', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Inbox size={32} color="#a1a1aa" />
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#3f3f46', marginBottom: '8px' }}>
                        Nenhum pedido encontrado
                    </h3>
                    <p style={{ color: '#71717a', maxWidth: '300px', margin: '0 auto' }}>
                        Aguardando novas mensagens do WhatsApp...
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {orders.map(group => (
                        <div key={group.customerPhone} style={{ opacity: expandedCustomers[group.customerPhone] ? 1 : 0.8, transition: 'opacity 0.2s' }}>

                            {/* Customer Header */}
                            <div
                                onClick={() => toggleExpand(group.customerPhone)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '16px',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff3e0', color: '#e58e26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        {group.customerName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3436' }}>
                                            {group.customerName || 'Cliente WhatsApp'}
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#636e72', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Phone size={12} /> {group.customerPhone}
                                        </p>
                                    </div>
                                    <div style={{ marginLeft: '16px', padding: '4px 12px', borderRadius: '12px', background: '#ecf0f1', fontSize: '0.8rem', fontWeight: 600, color: '#2d3436' }}>
                                        {group.orders.length} ite{group.orders.length > 1 ? 'ns' : 'm'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#636e72', display: 'block' }}>Total Estimado</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00b894' }}>
                                            R$ {group.totalValue.toFixed(2)}
                                        </span>
                                    </div>
                                    {expandedCustomers[group.customerPhone] ? <ChevronUp size={20} color="#b2bec3" /> : <ChevronDown size={20} color="#b2bec3" />}
                                </div>
                            </div>

                            {/* Orders Grid (Collapsible) */}
                            {expandedCustomers[group.customerPhone] && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                    gap: '20px',
                                    paddingLeft: '16px',
                                    borderLeft: '2px solid #fdcb6e',
                                    animation: 'fadeIn 0.3s ease'
                                }}>
                                    {group.orders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            onClick={setSelectedOrder}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
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

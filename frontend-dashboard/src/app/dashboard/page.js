'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard/OrderCard';
import EditModal from '../../components/orders/EditModal/EditModal';
import { Package, RefreshCw, Inbox, Phone, ChevronDown, ChevronUp, CheckSquare, Square, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [expandedCustomers, setExpandedCustomers] = useState({});
    const [selectedOrders, setSelectedOrders] = useState({}); // { orderId: true/false }
    const [syncing, setSyncing] = useState(null); // phone of customer currently syncing

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/orders?limit=100');
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

            const groupedArray = Object.values(grouped).sort((a, b) => {
                const latestA = new Date(a.orders[0].createdAt);
                const latestB = new Date(b.orders[0].createdAt);
                return latestB - latestA;
            });

            setOrders(groupedArray);

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

    // Toggle single order selection
    const toggleOrderSelection = (order) => {
        if (order.blingSyncedAt) return;
        setSelectedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }));
    };

    // Select/Deselect all PENDING orders for a customer
    const toggleSelectAllForCustomer = (group) => {
        const pendingOrders = group.orders.filter(o => !o.blingSyncedAt);
        if (pendingOrders.length === 0) return;

        const allSelected = pendingOrders.every(o => selectedOrders[o.id]);
        const newSelections = { ...selectedOrders };

        pendingOrders.forEach(o => {
            newSelections[o.id] = !allSelected;
        });
        setSelectedOrders(newSelections);
    };

    // Check if all PENDING orders for a customer are selected
    const areAllSelectedForCustomer = (group) => {
        const pendingOrders = group.orders.filter(o => !o.blingSyncedAt);
        return pendingOrders.length > 0 && pendingOrders.every(o => selectedOrders[o.id]);
    };

    // Get selected order IDs for a customer (only pending ones should be select-able anyway)
    const getSelectedIdsForCustomer = (group) => {
        return group.orders.filter(o => selectedOrders[o.id]).map(o => o.id);
    };

    // Sync selected orders
    const handleSyncSelected = async (group) => {
        const selectedIds = getSelectedIdsForCustomer(group);

        if (selectedIds.length === 0) {
            alert('Selecione pelo menos um pedido pendente para sincronizar.');
            return;
        }

        if (!confirm(`Deseja sincronizar ${selectedIds.length} pedido(s) separadamente?`)) return;

        setSyncing(group.customerPhone);
        try {
            // Sync each selected order individually (mode=single means no auto-grouping)
            for (const id of selectedIds) {
                await api.post(`/orders/${id}/sync-bling?mode=single`);
            }
            alert(`Sucesso! ${selectedIds.length} pedido(s) foram sincronizados individualmente.`);

            // Clear selections for this customer
            const newSelections = { ...selectedOrders };
            group.orders.forEach(o => { newSelections[o.id] = false; });
            setSelectedOrders(newSelections);

            fetchOrders();
        } catch (err) {
            alert('Erro ao sincronizar: ' + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(null);
        }
    };

    // Sync ALL orders for a customer (grouped into one Bling order)
    const handleSyncAllGrouped = async (group) => {
        // Only sync PENDING orders (not yet synced to Bling)
        const pendingOrders = group.orders.filter(o => !o.blingSyncedAt);

        if (pendingOrders.length === 0) {
            alert('Todos os pedidos deste cliente já foram sincronizados!');
            return;
        }

        if (!confirm(`Deseja sincronizar ${pendingOrders.length} pedido(s) pendentes deste cliente como UM ÚNICO pedido agrupado no Bling?`)) return;

        setSyncing(group.customerPhone);
        try {
            await api.post(`/customers/${encodeURIComponent(group.customerPhone)}/sync`);
            alert('Sucesso! Todos os pedidos pendentes foram agrupados e sincronizados com o Bling.');
            fetchOrders();
        } catch (err) {
            alert('Erro: ' + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(null);
        }
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
                        Selecione pedidos para sincronizar individualmente ou em lote
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
                    {orders.map(group => {
                        const selectedCount = getSelectedIdsForCustomer(group).length;
                        const allSelected = areAllSelectedForCustomer(group);
                        const isSyncing = syncing === group.customerPhone;

                        return (
                            <div key={group.customerPhone} className="card" style={{ overflow: 'hidden' }}>

                                {/* Customer Header */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '20px 24px',
                                        background: expandedCustomers[group.customerPhone] ? '#fffbf5' : 'white',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    onClick={() => toggleExpand(group.customerPhone)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Select All Checkbox */}
                                        <div
                                            onClick={(e) => { e.stopPropagation(); toggleSelectAllForCustomer(group); }}
                                            style={{ cursor: 'pointer', color: allSelected ? '#e67e22' : '#b2bec3' }}
                                        >
                                            {allSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                                        </div>

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
                                        {selectedCount > 0 && (
                                            <div style={{ padding: '4px 12px', borderRadius: '12px', background: '#fff3e0', fontSize: '0.8rem', fontWeight: 600, color: '#e67e22' }}>
                                                {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Sync Selected Button */}
                                        {selectedCount > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSyncSelected(group); }}
                                                disabled={isSyncing}
                                                style={{
                                                    padding: '8px 14px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: '#3498db',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                Sinc. Selecionados
                                            </button>
                                        )}

                                        {/* Sync All Grouped Button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSyncAllGrouped(group); }}
                                            disabled={isSyncing}
                                            style={{
                                                padding: '8px 14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#e67e22',
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                            Sinc. Tudo
                                        </button>

                                        <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#636e72', display: 'block' }}>Total</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#00b894' }}>
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
                                        gap: '16px',
                                        padding: '20px 24px',
                                        background: '#fafafa',
                                        borderTop: '1px solid #f1f2f6'
                                    }}>
                                        {group.orders.map(order => (
                                            <div key={order.id} style={{ position: 'relative' }}>
                                                {/* Checkbox Overlay - Hide if processed */}
                                                {!order.blingSyncedAt && (
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); toggleOrderSelection(order); }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '12px',
                                                            left: '12px',
                                                            zIndex: 10,
                                                            cursor: 'pointer',
                                                            background: 'white',
                                                            borderRadius: '4px',
                                                            padding: '2px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                            color: selectedOrders[order.id] ? '#e67e22' : '#b2bec3'
                                                        }}
                                                    >
                                                        {selectedOrders[order.id] ? <CheckSquare size={20} /> : <Square size={20} />}
                                                    </div>
                                                )}

                                                <OrderCard
                                                    order={order}
                                                    onClick={setSelectedOrder}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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

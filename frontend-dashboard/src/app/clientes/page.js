'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Package, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';

export default function ClientsPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(null); // Phone of customer currently syncing
    const [expandedCustomer, setExpandedCustomer] = useState(null); // Phone of expanded customer
    const [customerOrders, setCustomerOrders] = useState({}); // Cache for fetched orders { phone: [orders] }

    // Campaign Filter (from localStorage)
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [selectedCampaignName, setSelectedCampaignName] = useState('Todas Ativas');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Read selected campaign from localStorage
        const campaignId = localStorage.getItem('selectedCampaignId') || '';
        const campaignName = localStorage.getItem('selectedCampaignName') || 'Todas Ativas';
        setSelectedCampaignId(campaignId);
        setSelectedCampaignName(campaignName);
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            fetchCustomers();
        }
    }, [selectedCampaignId, isInitialized]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const campaignFilter = selectedCampaignId ? `?campaignId=${selectedCampaignId}` : '';
            const res = await api.get(`/customers${campaignFilter}`);
            setCustomers(res.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdersForCustomer = async (phone) => {
        if (customerOrders[phone]) return; // Already fetched

        try {
            const res = await api.get(`/customers/${encodeURIComponent(phone)}/orders`);
            setCustomerOrders(prev => ({ ...prev, [phone]: res.data }));
        } catch (error) {
            console.error('Failed to fetch orders', error);
        }
    };

    const toggleExpand = (phone) => {
        if (expandedCustomer === phone) {
            setExpandedCustomer(null);
        } else {
            setExpandedCustomer(phone);
            fetchOrdersForCustomer(phone);
        }
    };

    const handleSyncAll = async (phone) => {
        if (!confirm('Deseja sincronizar TODOS os pedidos pendentes deste cliente para o Bling agora?')) return;

        setSyncing(phone);
        try {
            await api.post(`/customers/${encodeURIComponent(phone)}/sync`);
            alert('Sincronização iniciada com sucesso!');
            fetchCustomers(); // Refresh stats
            if (expandedCustomer === phone) fetchOrdersForCustomer(phone); // Refresh list
        } catch (error) {
            alert('Erro ao sincronizar: ' + (error.response?.data?.error || error.message));
        } finally {
            setSyncing(null);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ffeaa7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={28} color="#d35400" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Clientes</h1>
                        <p style={{ color: '#636e72' }}>Gerencie pedidos por cliente</p>
                    </div>
                </div>

                {/* Campaign Badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: selectedCampaignId ? '#fff3e0' : '#f5f5f5',
                    borderRadius: '8px',
                    border: selectedCampaignId ? '1px solid #e67e22' : '1px solid #dfe6e9'
                }}>
                    <span style={{ color: '#636e72', fontSize: '0.9rem' }}>Campanha:</span>
                    <span style={{
                        fontWeight: 600,
                        color: selectedCampaignId ? '#e67e22' : '#2d3436',
                        fontSize: '0.9rem'
                    }}>
                        {selectedCampaignName}
                    </span>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#636e72' }}>Carregando clientes...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {customers.map((customer) => (
                        <div key={customer.customerPhone} className="card" style={{ overflow: 'hidden' }}>

                            {/* Header Row */}
                            <div
                                style={{
                                    padding: '20px 24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    background: expandedCustomer === customer.customerPhone ? '#fffbf5' : 'white',
                                    transition: 'background 0.2s'
                                }}
                                onClick={() => toggleExpand(customer.customerPhone)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: '#ffecd1',
                                            color: '#d35400',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 700
                                        }}>
                                            {customer.name?.charAt(0).toUpperCase() || 'C'}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#2d3436' }}>
                                                {customer.name || 'Desconhecido'}
                                            </h3>
                                            <p style={{ fontSize: '0.9rem', color: '#636e72', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} /> {customer.customerPhone}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ padding: '4px 12px', background: '#f5f6fa', borderRadius: '8px', fontSize: '0.85rem' }}>
                                            Total: <strong>{customer.totalOrders}</strong>
                                        </div>
                                        {parseInt(customer.pendingOrders) > 0 && (
                                            <div style={{ padding: '4px 12px', background: '#fff3e0', color: '#d35400', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                Pendentes: {customer.pendingOrders}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {parseInt(customer.pendingOrders) > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSyncAll(customer.customerPhone); }}
                                            className="btn btn-primary"
                                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                            disabled={syncing === customer.customerPhone}
                                        >
                                            <RefreshCw size={16} className={syncing === customer.customerPhone ? 'animate-spin' : ''} />
                                            {syncing === customer.customerPhone ? 'Sincronizando...' : 'Sincronizar Pendentes'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Orders List */}
                            {expandedCustomer === customer.customerPhone && (
                                <div style={{
                                    borderTop: '1px solid #f1f2f6',
                                    padding: '0',
                                    background: '#fafafa',
                                    animation: 'fadeIn 0.2s'
                                }}>
                                    {!customerOrders[customer.customerPhone] ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#b2bec3' }}>Carregando pedidos...</div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #eee', fontSize: '0.8rem', color: '#636e72', textAlign: 'left' }}>
                                                    <th style={{ padding: '12px 24px' }}>ID</th>
                                                    <th style={{ padding: '12px 24px' }}>Data</th>
                                                    <th style={{ padding: '12px 24px' }}>Produto</th>
                                                    <th style={{ padding: '12px 24px' }}>Status</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'right' }}>Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {customerOrders[customer.customerPhone].map(order => (
                                                    <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                                                        <td style={{ padding: '12px 24px', fontWeight: 600 }}>#{order.id}</td>
                                                        <td style={{ padding: '12px 24px', fontSize: '0.9rem', color: '#636e72' }}>
                                                            {new Date(order.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
                                                            {order.productRaw || 'Produto não identificado'}
                                                        </td>
                                                        <td style={{ padding: '12px 24px' }}>
                                                            {order.status === 'PROCESSED' ? (
                                                                <span className="badge badge-green"><CheckCircle size={10} /> Sincronizado</span>
                                                            ) : (
                                                                <span className="badge badge-yellow"><Clock size={10} /> Pendente</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 600 }}>
                                                            R$ {Number(order.sellPrice).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                        </div>
                    ))}

                    {customers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#b2bec3' }}>
                            Nenhum cliente encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

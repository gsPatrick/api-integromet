'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import OrderCard from '../../components/orders/OrderCard/OrderCard';
import EditModal from '../../components/orders/EditModal/EditModal';
import MessagePreviewModal from '../../components/orders/MessagePreviewModal/MessagePreviewModal';
import { Package, RefreshCw, Inbox, Phone, ChevronDown, ChevronUp, CheckSquare, Square, Loader2, MessageSquare } from 'lucide-react';

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [expandedCustomers, setExpandedCustomers] = useState({});
    const [selectedOrders, setSelectedOrders] = useState({}); // { orderId: true/false }
    const [syncing, setSyncing] = useState(null); // phone of customer currently syncing
    const [previewData, setPreviewData] = useState(null); // { group, selectedIds }

    // ... (fetchOrders, toggleExpand, etc remain same, skipping lines)

    // Open Confirmation Preview
    const handleSendConfirmation = (group) => {
        const selectedIds = getSelectedIdsForCustomer(group);

        if (selectedIds.length === 0) {
            alert('Selecione os pedidos que deseja incluir na confirmação.');
            return;
        }

        setPreviewData({ group, selectedIds });
    };

    // ... (rest of code)

    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Send Confirmation Button */}
        {selectedCount > 0 && (
            <button
                onClick={(e) => { e.stopPropagation(); handleSendConfirmation(group); }}
                disabled={!!previewData} // Disable if preview modal is open
                style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#10b981', // Emerald green
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
            >
                {/* Loader for sending is now inside the modal */}
                <MessageSquare size={14} />
                Enviar Confirmação
            </button>
        )}

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
                                </div >

        {/* Orders Grid (Collapsible) */ }
    {
        expandedCustomers[group.customerPhone] && (
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
        )
    }
                            </div >
                        );
})}
                </div >
            )}

{/* Edit Modal */ }
{
    selectedOrder && (
        <EditModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onSave={() => { setSelectedOrder(null); fetchOrders(); }}
        />
    )
}
{/* Message Preview Modal */ }
{
    previewData && (
        <MessagePreviewModal
            group={previewData.group}
            selectedIds={previewData.selectedIds}
            onClose={() => setPreviewData(null)}
            onSuccess={(count) => {
                setPreviewData(null);
                alert(`Sucesso! Mensagem enviada para o cliente.`);
            }}
        />
    )
}
        </div >
    );
}

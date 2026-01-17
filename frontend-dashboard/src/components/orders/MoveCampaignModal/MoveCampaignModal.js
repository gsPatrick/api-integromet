import { useState, useEffect } from 'react';
import api from '../../../services/api';

export default function MoveCampaignModal({ selectedIds, onClose, onSuccess }) {
    const [campaigns, setCampaigns] = useState([]);
    const [targetId, setTargetId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/campaigns').then(res => setCampaigns(res.data.filter(c => c.isActive))).catch(console.error);
    }, []);

    // Helper to clean campaign name (remove " ou ...")
    const cleanName = (name) => name?.split(' ou ')[0] || name;

    const handleConfirm = async () => {
        if (!targetId) return;
        setLoading(true);
        try {
            await api.put('/orders/move', { orderIds: selectedIds, targetCampaignId: targetId });
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao mover pedidos: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div className="modal-content animate-slideUp" onClick={e => e.stopPropagation()} style={{
                background: 'white', padding: '32px', borderRadius: '20px',
                width: '450px', maxWidth: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#1a1a1a' }}>
                        Mover Pedidos
                    </h2>
                    <p style={{ color: '#666' }}>
                        Selecione a nova campanha para os <strong>{selectedIds.length}</strong> pedidos selecionados.
                    </p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#444', fontWeight: 600 }}>Nova Campanha</label>
                    <select
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            border: '1px solid #e0e0e0', fontSize: '1rem', outline: 'none',
                            background: '#fafafa'
                        }}
                    >
                        <option value="" disabled>Selecione a campanha...</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{cleanName(c.name)}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} style={{
                        padding: '14px 20px', borderRadius: '12px', border: 'none',
                        background: '#f5f5f5', cursor: 'pointer', fontWeight: 600, color: '#666'
                    }}>
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} disabled={!targetId || loading} style={{
                        padding: '14px 28px', borderRadius: '12px',
                        background: '#e67e22', color: 'white', border: 'none',
                        fontWeight: 600, cursor: 'pointer',
                        opacity: (!targetId || loading) ? 0.5 : 1,
                        transition: 'opacity 0.2s'
                    }}>
                        {loading ? 'Movendo...' : 'Confirmar e Mover'}
                    </button>
                </div>
            </div>
        </div>
    );
}

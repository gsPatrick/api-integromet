import React, { useState, useEffect } from 'react';
import { X, Send, Phone } from 'lucide-react';
import api from '../../../services/api';

export default function MessagePreviewModal({ group, selectedIds, onClose, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchPreview();
    }, []);

    const fetchPreview = async () => {
        try {
            const res = await api.post('/orders/send-confirmation', {
                orderIds: selectedIds,
                preview: true // Fetch preview only
            });
            setMessage(res.data.message);
        } catch (err) {
            console.error(err);
            alert('Falha ao gerar prévia da mensagem');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const res = await api.post('/orders/send-confirmation', {
                orderIds: selectedIds,
                customMessage: message // successful override
            });
            onSuccess(res.data.sent);
        } catch (err) {
            alert('Erro ao enviar mensagem: ' + (err.response?.data?.error || err.message));
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Confirmar Envio</h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Revise a mensagem para <strong>{group.customerName}</strong>
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            Gerando prévia da mensagem...
                        </div>
                    ) : (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                Mensagem do WhatsApp
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '400px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    resize: 'none',
                                    fontFamily: 'monospace'
                                }}
                            />
                            <p style={{ marginTop: '8px', fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={12} /> Enviando para: {group.customerPhone}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '20px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f9fafb', borderRadius: '0 0 16px 16px' }}>
                    <button
                        onClick={onClose}
                        disabled={sending}
                        style={{
                            padding: '10px 16px',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontWeight: 500,
                            color: '#374151',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={loading || sending}
                        style={{
                            padding: '10px 20px',
                            background: '#10b981',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: (loading || sending) ? 0.7 : 1
                        }}
                    >
                        {sending ? 'Enviando...' : (
                            <>
                                <Send size={18} />
                                Enviar Mensagem
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

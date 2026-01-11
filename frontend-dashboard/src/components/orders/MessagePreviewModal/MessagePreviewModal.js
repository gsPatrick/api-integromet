import React, { useState, useEffect } from 'react';
import { X, Send, Phone, CreditCard, Loader2, LinkIcon, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

export default function MessagePreviewModal({ group, selectedIds, onClose, onSuccess }) {
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [generatePaymentLink, setGeneratePaymentLink] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState(null);
    const [linkGenerated, setLinkGenerated] = useState(false);

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

    const handleGeneratePaymentLink = async () => {
        setGeneratingLink(true);
        try {
            const res = await api.post('/orders/generate-link-sync', {
                orderIds: selectedIds
            });

            const link = res.data.paymentLink;
            setPaymentLink(link);
            setLinkGenerated(true);

            // Inject payment link into message
            const paymentText = `\n\n💳 *Pague pelo link:*\n${link}`;
            setMessage(prev => prev + paymentText);

            return link;
        } catch (err) {
            console.error(err);
            alert('Erro ao gerar link de pagamento: ' + (err.response?.data?.error || err.message));
            return null;
        } finally {
            setGeneratingLink(false);
        }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            // If checkbox is checked and link not generated yet, generate first
            if (generatePaymentLink && !paymentLink) {
                const link = await handleGeneratePaymentLink();
                if (!link) {
                    setSending(false);
                    return; // Stop if link generation failed
                }
            }

            const res = await api.post('/orders/send-confirmation', {
                orderIds: selectedIds,
                customMessage: message
            });
            onSuccess(res.data.sent);
        } catch (err) {
            alert('Erro ao enviar mensagem: ' + (err.response?.data?.error || err.message));
        } finally {
            setSending(false);
        }
    };

    // Handler for "Generate Link Only" - generates link and lets user edit message
    const handleGenerateLinkOnly = async () => {
        const link = await handleGeneratePaymentLink();
        if (link) {
            // Just show success - user can edit and send
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
                maxWidth: '650px',
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
                            {/* Payment Link Section */}
                            <div style={{
                                marginBottom: '16px',
                                padding: '16px',
                                background: linkGenerated ? '#f0fdf4' : '#fef3c7',
                                borderRadius: '12px',
                                border: linkGenerated ? '1px solid #bbf7d0' : '1px solid #fcd34d'
                            }}>
                                {!linkGenerated ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <CreditCard size={20} color="#d97706" />
                                            <span style={{ fontWeight: 600, color: '#d97706' }}>
                                                Deseja gerar link de pagamento?
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '12px' }}>
                                            Isso irá sincronizar o pedido no Bling (como "Em aberto") e criar uma cobrança no Asaas.
                                        </p>
                                        <button
                                            onClick={handleGenerateLinkOnly}
                                            disabled={generatingLink}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                background: '#f59e0b',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                opacity: generatingLink ? 0.7 : 1
                                            }}
                                        >
                                            {generatingLink ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Gerando Link + Sincronizando Bling...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard size={18} />
                                                    Gerar Link Asaas + Sync Bling
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <CheckCircle size={20} color="#16a34a" />
                                            <span style={{ fontWeight: 600, color: '#16a34a' }}>
                                                Link gerado com sucesso!
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '8px' }}>
                                            O pedido foi sincronizado no Bling como "Em aberto". Quando o cliente pagar, será marcado como "Atendido" automaticamente.
                                        </p>
                                        <div style={{
                                            padding: '10px',
                                            background: '#dcfce7',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <LinkIcon size={16} color="#16a34a" />
                                            <a
                                                href={paymentLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    color: '#0284c7',
                                                    textDecoration: 'underline',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    flex: 1
                                                }}
                                            >
                                                {paymentLink}
                                            </a>
                                        </div>
                                    </>
                                )}
                            </div>

                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                                Mensagem do WhatsApp {linkGenerated && <span style={{ color: '#16a34a' }}>(Link adicionado ✓)</span>}
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '320px',
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
                        disabled={sending || generatingLink}
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
                        disabled={loading || sending || generatingLink}
                        style={{
                            padding: '10px 24px',
                            background: '#10b981',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: (loading || sending || generatingLink) ? 0.7 : 1
                        }}
                    >
                        {sending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
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

'use client';

import useSWR from 'swr';
import api from '../../services/api';
import { CheckCircle, Clock, Radio, Package, User, Phone } from 'lucide-react';
import Image from 'next/image';

const fetcher = url => api.get(url).then(res => res.data.data);

const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_URL}${imageUrl}`;
};

export default function HistoryPage() {
    const { data: orders, error } = useSWR('/orders', fetcher, { refreshInterval: 3000 });
    const loading = !orders && !error;

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
                        <Radio size={28} color="#2563eb" />
                        Histórico em Tempo Real
                    </h1>
                    <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                        Monitorando novos pedidos chegando do WhatsApp
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '8px 16px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#16a34a',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                    }} />
                    Ao Vivo
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                        <tr>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produto</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes IA</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                            <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horário</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#71717a' }}>
                                    Carregando feed...
                                </td>
                            </tr>
                        )}

                        {orders && orders.map(order => {
                            const imgUrl = getImageUrl(order.imageUrl);
                            return (
                                <tr key={order.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                position: 'relative',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                background: '#f4f4f5',
                                                flexShrink: 0
                                            }}>
                                                {imgUrl ? (
                                                    <Image src={imgUrl} alt="Prod" fill style={{ objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                        <Package size={20} color="#a1a1aa" />
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 500, color: '#0a0a0a' }}>
                                                {order.productRaw || 'Produto Desconhecido'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: '#0a0a0a', marginBottom: '2px' }}>
                                            <User size={14} color="#71717a" />
                                            {order.customerName}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#71717a' }}>
                                            <Phone size={12} />
                                            {order.customerPhone}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                            <span className="badge badge-blue">{order.extractedSize || '?'}</span>
                                            <span className="badge badge-gray">{order.extractedColor || '?'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0a0a0a' }}>
                                            R$ {Number(order.sellPrice || 0).toFixed(2)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {order.status === 'PROCESSED' ? (
                                            <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={12} /> Sucesso
                                            </span>
                                        ) : (
                                            <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', color: '#71717a', fontSize: '0.875rem' }}>
                                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

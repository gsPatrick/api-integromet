'use client';

import useSWR from 'swr';
import api from '../../services/api';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Image from 'next/image';

const fetcher = url => api.get(url).then(res => res.data.data);

// API Base URL for images
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Histórico em Tempo Real 🔴</h1>
                    <p style={{ color: '#64748b' }}>Monitorando novos pedidos chegando do WhatsApp...</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600 }}>
                    <div style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
                    Ao Vivo
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Produto</th>
                            <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Cliente</th>
                            <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Extração IA</th>
                            <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Status</th>
                            <th style={{ padding: '16px', fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Horário</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Carregando feed...</td></tr>
                        )}

                        {orders && orders.map(order => {
                            const imgUrl = getImageUrl(order.imageUrl);
                            return (
                                <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '48px', height: '48px', position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                {imgUrl && <Image src={imgUrl} alt="Prod" fill style={{ objectFit: 'cover' }} />}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{order.productRaw || 'Produto Desconhecido'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 500 }}>{order.customerName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{order.customerPhone}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <span className="badge badge-blue">{order.extractedSize || '?'}</span>
                                            <span className="badge badge-yellow">{order.extractedColor || '?'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', marginTop: '4px', fontWeight: 600 }}>R$ {order.sellPrice}</div>
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
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '0.875rem' }}>
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

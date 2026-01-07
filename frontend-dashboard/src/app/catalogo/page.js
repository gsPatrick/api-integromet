'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Upload, Search, Trash2, Loader2, AlertCircle, FileText, CheckCircle, Sparkles, Database } from 'lucide-react';
import api from '../../services/api';

export default function CatalogPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [catalogStatus, setCatalogStatus] = useState({ totalProducts: 0, catalogs: [] });
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProducts();
        fetchStatus();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/catalog');
            setProducts(res.data.data || []);
        } catch (error) {
            console.error('Error fetching catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await api.get('/catalog/status');
            setCatalogStatus(res.data);
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const handlePdfUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Por favor, selecione um arquivo PDF.');
            return;
        }

        const catalogName = prompt('Nome do catálogo (ex: Inverno 2026):', file.name.replace('.pdf', ''));
        if (!catalogName) return;

        setUploadingPdf(true);
        setUploadProgress('Iniciando upload...');

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('catalogName', catalogName);

            // Simulation messages for better UX since backend process is complex
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev === 'Iniciando upload...') return 'Enviando para OpenAI Assistant...';
                    if (prev === 'Enviando para OpenAI Assistant...') return 'Extraindo produtos e preços...';
                    return prev;
                });
            }, 3000);

            const res = await api.post('/catalog/upload-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 600000 // 10 minutes timeout
            });

            clearInterval(progressInterval);
            setUploadProgress('');
            alert(`✅ Catálogo processado com sucesso!\n\n📄 Páginas processadas: ${res.data.pagesProcessed}\n👗 Produtos extraídos: ${res.data.productsFound}\n🧠 AI Assistant: Atualizado`);

            fetchProducts();
            fetchStatus();
        } catch (error) {
            console.error('PDF upload error:', error);
            alert('Erro ao processar PDF: ' + (error.response?.data?.error || error.message));
        } finally {
            setUploadingPdf(false);
            setUploadProgress('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleResetCatalog = async () => {
        if (!confirm('ATENÇÃO: Isso apagará TODOS os produtos do banco de dados.\n\nDeseja continuar?')) return;

        try {
            await api.delete('/catalog/reset');
            alert('Catálogo resetado com sucesso!');
            fetchProducts();
            fetchStatus();
        } catch (error) {
            alert('Erro ao resetar: ' + error.message);
        }
    };

    const filteredProducts = products.filter(p =>
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)' }}>
                    <BookOpen size={32} color="white" />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>Catálogo Inteligente</h1>
                    <p style={{ color: '#636e72', fontSize: '1.1rem' }}>Gerenciamento central do banco de preços e IA</p>
                </div>
            </div>

            {/* Main Upload Section */}
            <div className="card" style={{ padding: '40px', marginBottom: '32px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', textAlign: 'center', border: '2px dashed #e0e0e0' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ width: '80px', height: '80px', background: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <Upload size={40} color="#2196f3" />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: '#1a1a1a' }}>Adicionar Novo Catálogo PDF</h2>
                    <p style={{ color: '#636e72', marginBottom: '32px', lineHeight: '1.6' }}>
                        Faça upload do seu PDF atualizado. O sistema irá processá-lo de duas formas:
                        <br />
                        <strong>1. Extração Automática:</strong> Identifica códigos e preços para busca rápida.
                        <br />
                        <strong>2. IA Assistant:</strong> O PDF é lido pelo GPT para responder perguntas complexas.
                    </p>

                    <input
                        type="file"
                        accept=".pdf"
                        ref={fileInputRef}
                        onChange={handlePdfUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingPdf}
                    />

                    <button
                        className="btn btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPdf}
                        style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '12px', background: '#2196f3', boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)' }}
                    >
                        {uploadingPdf ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Loader2 className="animate-spin" size={24} />
                                {uploadProgress || 'Processando...'}
                            </div>
                        ) : (
                            <>
                                <FileText size={24} style={{ marginRight: '12px' }} />
                                Selecionar Arquivo PDF
                            </>
                        )}
                    </button>

                    {uploadingPdf && (
                        <p style={{ marginTop: '16px', fontSize: '0.9rem', color: '#f57c00' }}>
                            ⚠️ Não feche esta página. O processamento de catálogos grandes pode levar alguns minutos.
                        </p>
                    )}
                </div>
            </div>

            {/* AI Status & Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Database size={24} color="#66bb6a" />
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Banco de Dados Local</h3>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2e7d32', marginBottom: '8px' }}>
                        {catalogStatus.totalProducts}
                    </div>
                    <p style={{ color: '#636e72', fontSize: '0.9rem' }}>Produtos extraídos e indexados para busca de preço instantânea.</p>
                </div>

                <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)', border: '1px solid #eee' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Sparkles size={24} color="#ab47bc" />
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Inteligência Artificial</h3>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#7b1fa2', marginBottom: '8px' }}>
                        {catalogStatus.catalogs?.length > 0 ? 'Ativo e Treinado' : 'Aguardando Dados'}
                    </div>
                    <p style={{ color: '#636e72', fontSize: '0.9rem' }}>
                        {catalogStatus.catalogs?.length} catálogo(s) carregado(s) no assistente virtual para consultas complexas.
                    </p>
                </div>
            </div>

            {/* Search & List */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>

                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#90a4ae' }} />
                        <input
                            type="text"
                            className="input"
                            style={{ paddingLeft: '48px', height: '48px', fontSize: '1rem', width: '100%', borderRadius: '8px', border: '1px solid #cfd8dc' }}
                            placeholder="Pesquisar produto por código ou nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button className="btn" style={{ background: '#ffebee', color: '#c62828' }} onClick={handleResetCatalog}>
                        <Trash2 size={18} /> Limpar Tudo
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={40} color="#2196f3" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#90a4ae' }}>
                        <BookOpen size={64} style={{ opacity: 0.2, marginBottom: '16px', margin: '0 auto' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Nenhum produto encontrado</p>
                        <p>Faça upload de um catálogo PDF para começar.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <tr>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: '#37474f' }}>Código</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: '#37474f' }}>Produto</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 600, color: '#37474f' }}>Categoria</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: '#37474f' }}>1-3</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: '#37474f' }}>4-8</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: '#37474f' }}>10-12</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 600, color: '#37474f' }}>Pág</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1976d2' }}>{product.code}</td>
                                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>{product.name || '-'}</td>
                                        <td style={{ padding: '16px 24px', color: '#546e7a' }}>
                                            <span style={{ background: '#eceff1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                                {product.category || 'Geral'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                            {product.price_1_3 ? `R$ ${parseFloat(product.price_1_3).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                            {product.price_4_8 ? `R$ ${parseFloat(product.price_4_8).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                            {product.price_10_12 ? `R$ ${parseFloat(product.price_10_12).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'center', color: '#90a4ae', fontSize: '0.9rem' }}>
                                            {product.pageNumber || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

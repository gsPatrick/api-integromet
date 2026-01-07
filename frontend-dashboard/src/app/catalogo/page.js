'use client';

import { useState, useEffect, useRef } from 'react';
import { BookOpen, Upload, Search, Trash2, Loader2, AlertCircle, FileText, CheckCircle, Sparkles, Database, X } from 'lucide-react';
import api from '../../services/api';

export default function CatalogPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [enteredName, setEnteredName] = useState('');
    const [showNameModal, setShowNameModal] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState(''); // 'uploading', 'indexing', 'success', 'error'
    const [uploadError, setUploadError] = useState('');

    const [catalogStatus, setCatalogStatus] = useState({ totalProducts: 0, catalogs: [] });
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Initial load only fetches status, products are secondary now
        fetchStatus();
        fetchProducts();
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

    // 1. File Selected -> Open Name Modal
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            // Error toast could go here, for now valid check
            return;
        }

        setSelectedFile(file);
        setEnteredName(file.name.replace('.pdf', ''));
        setShowNameModal(true);

        // Reset input so same file can be selected again if needed
        event.target.value = '';
    };

    // 2. Name Confirmed -> Start Upload
    const handleConfirmUpload = async () => {
        if (!enteredName.trim() || !selectedFile) return;

        setShowNameModal(false);
        setIsUploading(true);
        setUploadStep('uploading');
        setUploadError('');

        const formData = new FormData();
        formData.append('pdf', selectedFile);
        formData.append('catalogName', enteredName);

        try {
            // Simulate progression for better UX
            const timer1 = setTimeout(() => setUploadStep('indexing'), 2000);

            await api.post('/catalog/upload-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 600000 // 10 minutes
            });

            clearTimeout(timer1);
            setUploadStep('success');

            // Refresh data behind scenes
            fetchStatus();
            fetchProducts();

        } catch (error) {
            setUploadStep('error');
            setUploadError(error.response?.data?.error || error.message);
        }
    };

    const handleCloseUploadModal = () => {
        // Only allow closing if success or error
        if (uploadStep === 'success') {
            setSelectedFile(null);
            setEnteredName('');
        }
        if (uploadStep === 'success' || uploadStep === 'error') {
            setIsUploading(false);
            setUploadStep('');
        }
        // If uploading, do nothing (prevent closing)
    };

    const handleResetCatalog = async () => {
        if (!confirm('ATENÇÃO: Isso apagará TODOS os dados do catálogo.\nDeseja continuar?')) return;
        try {
            await api.delete('/catalog/reset');
            fetchProducts();
            fetchStatus();
        } catch (error) {
            console.error(error);
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
                    <p style={{ color: '#636e72', fontSize: '1.1rem' }}>Gerenciamento de PDFs para Inteligência Artificial</p>
                </div>
            </div>

            {/* Main Upload Section */}
            <div className="card" style={{ padding: '40px', marginBottom: '32px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', textAlign: 'center', border: '2px dashed #e0e0e0' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ width: '80px', height: '80px', background: '#e3f2fd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                        <Upload size={40} color="#2196f3" />
                    </div>

                    <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: '#1a1a1a' }}>Adicionar Catálogo PDF</h2>
                    <p style={{ color: '#636e72', marginBottom: '32px', lineHeight: '1.6' }}>
                        Faça upload do PDF atualizado. Ele será enviado para a <strong>OpenAI</strong>, permitindo que a IA consulte preços e produtos diretamente no arquivo.
                    </p>

                    <input
                        type="file"
                        accept=".pdf"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    <button
                        className="btn btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '16px 32px', fontSize: '1.1rem', borderRadius: '12px', background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '12px' }}
                    >
                        <FileText size={24} />
                        Selecionar Arquivo PDF
                    </button>
                </div>
            </div>

            {/* AI Status Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Sparkles size={24} color="#ab47bc" />
                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Status da IA</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: catalogStatus.catalogs?.length > 0 ? '#4caf50' : '#bdbdbd' }}></div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1a1a1a' }}>
                            {catalogStatus.catalogs?.length > 0 ? 'Online & Treinada' : 'Aguardando Dados'}
                        </span>
                    </div>
                </div>

                <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Database size={24} color="#2196f3" />
                        <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>Catálogos Ativos</h3>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1565c0', marginBottom: '8px' }}>
                        {catalogStatus.catalogs?.length || 0}
                    </div>
                </div>
            </div>

            {/* Catalog List / Metadata */}
            <div className="card" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#37474f' }}>Catálogos Carregados</h3>
                    <button className="btn" style={{ background: '#ffebee', color: '#c62828', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }} onClick={handleResetCatalog}>
                        <Trash2 size={16} /> Limpar
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>
                ) : products.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>
                        <Database size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                        <p>Nenhum catálogo registrado.</p>
                    </div>
                ) : (
                    <div style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {products.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                        <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <FileText size={20} color="#546e7a" />
                                            <span style={{ fontWeight: 500, color: '#263238' }}>{p.catalogName || p.name}</span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#4caf50', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                                <CheckCircle size={16} /> Ativo na IA
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


            {/* --- MODALS --- */}

            {/* 1. Name Input Modal */}
            {showNameModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '450px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', fontWeight: 600 }}>Nome do Catálogo</h3>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#37474f' }}>Como deseja identificar este catálogo?</label>
                            <input
                                autoFocus
                                type="text"
                                value={enteredName}
                                onChange={(e) => setEnteredName(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cfd8dc', fontSize: '1rem', outline: 'none' }}
                                placeholder="Ex: Inverno 2026"
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                onClick={() => setShowNameModal(false)}
                                style={{ padding: '12px 20px', borderRadius: '8px', background: '#f5f5f5', color: '#546e7a', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmUpload}
                                disabled={!enteredName.trim()}
                                style={{ padding: '12px 24px', borderRadius: '8px', background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: enteredName.trim() ? 1 : 0.5 }}
                            >
                                Confirmar e Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Upload Status Modal */}
            {isUploading && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

                        {/* Status Icons */}
                        <div style={{ marginBottom: '24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {uploadStep === 'uploading' && <Loader2 size={48} className="animate-spin" color="#2196f3" />}
                            {uploadStep === 'indexing' && <Sparkles size={48} className="animate-pulse" color="#ab47bc" />}
                            {uploadStep === 'success' && <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={32} color="#4caf50" /></div>}
                            {uploadStep === 'error' && <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={32} color="#f44336" /></div>}
                        </div>

                        {/* Title */}
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', fontWeight: 700, color: '#1a1a1a' }}>
                            {uploadStep === 'uploading' && 'Enviando Arquivo...'}
                            {uploadStep === 'indexing' && 'Treinando IA...'}
                            {uploadStep === 'success' && 'Sucesso!'}
                            {uploadStep === 'error' && 'Erro no Envio'}
                        </h3>

                        {/* Description */}
                        <p style={{ color: '#636e72', marginBottom: '32px', fontSize: '1rem', lineHeight: '1.5' }}>
                            {uploadStep === 'uploading' && 'Fazendo upload seguro para a nuvem.'}
                            {uploadStep === 'indexing' && 'A inteligência artificial está lendo e indexando seu catálogo.'}
                            {uploadStep === 'success' && 'Catálogo pronto! A IA já pode consultar preços e produtos neste arquivo.'}
                            {uploadStep === 'error' && (uploadError || 'Ocorreu um problema inesperado.')}
                        </p>

                        {/* Action Button (Only for finish states) */}
                        {(uploadStep === 'success' || uploadStep === 'error') && (
                            <button
                                onClick={handleCloseUploadModal}
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: uploadStep === 'success' ? '#4caf50' : '#cfd8dc', color: uploadStep === 'success' ? 'white' : '#546e7a', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', transition: 'transform 0.1s' }}
                            >
                                {uploadStep === 'success' ? 'Concluir' : 'Fechar'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Upload, Search, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export default function CatalogPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [importing, setImporting] = useState(false);
    const [newProduct, setNewProduct] = useState({
        code: '',
        name: '',
        category: '',
        price_1_3: '',
        price_4_8: '',
        price_10_12: '',
        catalogName: ''
    });

    useEffect(() => {
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

    const handleAddProduct = async () => {
        if (!newProduct.code) {
            alert('Código do produto é obrigatório!');
            return;
        }

        try {
            await api.post('/catalog/product', {
                ...newProduct,
                price_1_3: newProduct.price_1_3 ? parseFloat(newProduct.price_1_3) : null,
                price_4_8: newProduct.price_4_8 ? parseFloat(newProduct.price_4_8) : null,
                price_10_12: newProduct.price_10_12 ? parseFloat(newProduct.price_10_12) : null
            });
            alert('Produto adicionado!');
            setNewProduct({ code: '', name: '', category: '', price_1_3: '', price_4_8: '', price_10_12: '', catalogName: '' });
            setShowAddForm(false);
            fetchProducts();
        } catch (error) {
            alert('Erro ao adicionar: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleBulkImport = async () => {
        const jsonInput = prompt('Cole o JSON com os produtos:\n\nFormato esperado:\n[\n  {"code": "46586", "name": "Conjunto...", "price_1_3": 141.61, "price_4_8": 161.86}\n]');

        if (!jsonInput) return;

        try {
            const products = JSON.parse(jsonInput);
            setImporting(true);

            const res = await api.post('/catalog/import', {
                products,
                catalogName: prompt('Nome do catálogo (ex: Verdi Inverno 2026):') || 'Catálogo Geral'
            });

            alert(`Importação concluída!\nCriados: ${res.data.created}\nAtualizados: ${res.data.updated}`);
            fetchProducts();
        } catch (error) {
            if (error instanceof SyntaxError) {
                alert('JSON inválido! Verifique o formato.');
            } else {
                alert('Erro na importação: ' + (error.response?.data?.error || error.message));
            }
        } finally {
            setImporting(false);
        }
    };

    const handleResetCatalog = async () => {
        if (!confirm('Tem certeza que deseja apagar TODOS os produtos do catálogo?')) return;

        try {
            await api.delete('/catalog/reset');
            alert('Catálogo resetado!');
            fetchProducts();
        } catch (error) {
            alert('Erro ao resetar: ' + error.message);
        }
    };

    const filteredProducts = products.filter(p =>
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={28} color="#4caf50" />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Catálogo de Produtos</h1>
                    <p style={{ color: '#636e72' }}>Importe e gerencie produtos para referência de preços</p>
                </div>
            </div>

            {/* Info Box */}
            <div className="card" style={{ padding: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertCircle size={24} color="#1976d2" />
                    <div>
                        <strong>Como funciona?</strong>
                        <p style={{ fontSize: '0.9rem', color: '#455a64', marginTop: '4px' }}>
                            Quando um cliente envia uma foto SEM preço visível, o sistema busca o código do produto neste catálogo
                            para encontrar o preço correto. Isso é útil para imagens de catálogo sem informações de preço.
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#636e72' }} />
                        <input
                            type="text"
                            className="input"
                            style={{ paddingLeft: '40px', width: '100%' }}
                            placeholder="Buscar por código ou nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus size={18} /> Adicionar Produto
                </button>

                <button className="btn btn-secondary" onClick={handleBulkImport} disabled={importing}>
                    {importing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    Importar JSON
                </button>

                <button className="btn" style={{ background: '#ffebee', color: '#c62828' }} onClick={handleResetCatalog}>
                    <Trash2 size={18} /> Resetar
                </button>
            </div>

            {/* Add Product Form */}
            {showAddForm && (
                <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Adicionar Produto</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Código *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="46586"
                                value={newProduct.code}
                                onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nome</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Conjunto Jaqueta..."
                                value={newProduct.name}
                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Categoria</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Conjunto"
                                value={newProduct.category}
                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Preço 1-3</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="141.61"
                                value={newProduct.price_1_3}
                                onChange={(e) => setNewProduct({ ...newProduct, price_1_3: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Preço 4-8</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="161.86"
                                value={newProduct.price_4_8}
                                onChange={(e) => setNewProduct({ ...newProduct, price_4_8: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Preço 10-12</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="188.86"
                                value={newProduct.price_10_12}
                                onChange={(e) => setNewProduct({ ...newProduct, price_10_12: e.target.value })}
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleAddProduct}>
                        <Save size={18} /> Salvar Produto
                    </button>
                </div>
            )}

            {/* Products Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Produtos no Catálogo</strong>
                    <span style={{ color: '#636e72' }}>{filteredProducts.length} produtos</span>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#636e72' }}>
                        <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p>Nenhum produto no catálogo</p>
                        <p style={{ fontSize: '0.85rem' }}>Adicione produtos manualmente ou importe via JSON</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Categoria</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>1-3</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>4-8</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>10-12</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Catálogo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} style={{ borderTop: '1px solid #eee' }}>
                                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1976d2' }}>{product.code}</td>
                                        <td style={{ padding: '12px 16px' }}>{product.name || '-'}</td>
                                        <td style={{ padding: '12px 16px' }}>{product.category || '-'}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {product.price_1_3 ? `R$ ${parseFloat(product.price_1_3).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {product.price_4_8 ? `R$ ${parseFloat(product.price_4_8).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            {product.price_10_12 ? `R$ ${parseFloat(product.price_10_12).toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#636e72' }}>{product.catalogName || '-'}</td>
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

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { X, User, Phone, Check, Search, Loader, AlertCircle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './BlingClientModal.module.css';

/**
 * Modal to confirm/select a Bling client when syncing an order
 * Shows the best match found and allows correction
 */
export default function BlingClientModal({
    customerPhone,
    customerName,
    onConfirm,  // Called when user confirms the selection
    onClose,
    onCreateNew  // Called when user wants to create a new client
}) {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [error, setError] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showAllClients, setShowAllClients] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Initial search by phone
        searchClients();
    }, [customerPhone]);

    const searchClients = async (manualTerm = null) => {
        setLoading(true);
        setError(null);
        try {
            let url = '/bling/clients/search?';

            if (manualTerm) {
                url += `term=${encodeURIComponent(manualTerm)}`;
            } else {
                url += `phone=${customerPhone}`;
            }

            const response = await api.get(url);
            const foundClients = response.data.clients || [];
            setClients(foundClients);

            // Auto-select best match (first one with CPF, or just first one)
            // But only auto-select on initial phone search, not manual search unless 1 result
            if (foundClients.length > 0) {
                if (!manualTerm || foundClients.length === 1) {
                    const withCpf = foundClients.find(c => c.cpfCnpj);
                    setSelectedClient(withCpf || foundClients[0]);
                } else {
                    setSelectedClient(null); // Let user choose from manual search
                }
            } else {
                setSelectedClient(null);
            }
        } catch (err) {
            console.error('Error searching Bling clients:', err);
            setError('Erro ao buscar clientes no Bling');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            searchClients(searchTerm);
        }
    };

    const handleConfirm = async () => {
        if (!selectedClient) {
            // No client found - will create new
            onCreateNew();
            return;
        }

        setSyncing(true);
        try {
            // Save the mapping
            await api.post('/bling/clients/mapping', {
                customerPhone,
                blingClientId: selectedClient.id,
                blingClientName: selectedClient.nome,
                blingClientCpfCnpj: selectedClient.cpfCnpj
            });

            onConfirm(selectedClient);
        } catch (err) {
            console.error('Error saving mapping:', err);
            alert('Erro ao salvar vínculo do cliente');
            setSyncing(false);
        }
    };

    const formatPhone = (phone) => {
        if (!phone) return '-';
        // Clean and format
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 11) {
            return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
        }
        return phone;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2>Confirmar Cliente Bling</h2>
                        <p className={styles.subtitle}>
                            Pedido de: <strong>{customerName}</strong>
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>

                    {/* Search Bar */}
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Buscar por Nome, CPF ou Telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 10px 36px',
                                    borderRadius: '8px',
                                    border: '1px solid #dfe6e9',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <Search size={16} color="#b2bec3" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0 16px',
                                background: '#0984e3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            Buscar
                        </button>
                    </form>

                    {loading ? (
                        <div className={styles.loadingState}>
                            <Loader className={styles.spinner} size={32} />
                            <p>Buscando cliente no Bling...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <AlertCircle size={32} />
                            <p>{error}</p>
                            <button onClick={() => searchClients()}>Tentar novamente</button>
                        </div>
                    ) : clients.length > 0 ? (
                        <>
                            {selectedClient ? (
                                <>
                                    {/* Selected Client Card */}
                                    <div className={styles.selectedSection}>
                                        <div className={styles.sectionLabel}>
                                            <Check size={16} className={styles.checkIcon} />
                                            Cliente Selecionado:
                                        </div>
                                        <div className={styles.selectedCard}>
                                            <div className={styles.clientMainInfo}>
                                                <div className={styles.clientName}>{selectedClient.nome}</div>
                                                {selectedClient.cpfCnpj && (
                                                    <span className={styles.cpfBadge}>
                                                        CPF/CNPJ: {selectedClient.cpfCnpj}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.clientContactInfo}>
                                                <div className={styles.contactRow}>
                                                    <span className={styles.contactLabel}>📱 Celular:</span>
                                                    <span>{formatPhone(selectedClient.celular) || '-'}</span>
                                                </div>
                                                <div className={styles.contactRow}>
                                                    <span className={styles.contactLabel}>📞 Telefone:</span>
                                                    <span>{formatPhone(selectedClient.telefone) || '-'}</span>
                                                </div>
                                                <div className={styles.contactRow}>
                                                    <span className={styles.contactLabel}>✉️ Email:</span>
                                                    <span>{selectedClient.email || '-'}</span>
                                                </div>
                                            </div>
                                            <button
                                                className={styles.changeBtn}
                                                onClick={() => setSelectedClient(null)}
                                                style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#f1f2f6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Trocar Cliente
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* List Selection Mode (No client selected yet) */
                                <div className={styles.selectionList}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#636e72' }}>
                                        {clients.length} clientes encontrados. Selecione um:
                                    </p>
                                    <div className={styles.clientList} style={{ maxHeight: '300px' }}>
                                        {clients.map((client) => (
                                            <div
                                                key={client.id}
                                                className={styles.clientOption}
                                                onClick={() => setSelectedClient(client)}
                                            >
                                                <div className={styles.optionInfo}>
                                                    <div className={styles.optionName}>{client.nome}</div>
                                                    <div className={styles.optionDetails}>
                                                        {client.cpfCnpj && <span className={styles.smallCpf}>{client.cpfCnpj}</span>}
                                                        {client.celular && <span>📱 {client.celular}</span>}
                                                    </div>
                                                </div>
                                                <button className={styles.useBtn}>Selecionar</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <Search size={32} />
                            <p>Nenhum cliente encontrado.</p>
                            <p className={styles.hint}>
                                Um novo cliente será criado automaticamente no Bling com os dados do pedido.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        className={styles.secondaryBtn}
                        onClick={onClose}
                        disabled={syncing}
                    >
                        Cancelar
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={onCreateNew}
                        disabled={syncing}
                    >
                        Criar Novo Cliente
                    </button>
                    <button
                        className={styles.primaryBtn}
                        onClick={handleConfirm}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <>
                                <Loader size={16} className={styles.spinner} />
                                Sincronizando...
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                {selectedClient ? 'Confirmar e Sincronizar' : 'Criar Cliente e Sincronizar'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

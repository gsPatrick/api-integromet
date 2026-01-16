'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { Upload, FileText, X, CheckCircle, Database, AlertCircle, Loader2, Play, Edit3, Trash2, Plus, Star, LogOut, ArrowRight, ToggleLeft, ToggleRight, Settings, Users, Paperclip } from 'lucide-react';
import Link from 'next/link';
import api from '../../../services/api';
const TARGET_GROUPS = [
    { id: '120363166864812600-group', name: 'Grupo VIP' },
    { id: '120363402015772186-group', name: 'Grupo Coletivino' }
];

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        isActive: false,
        markupPercentage: 0,
        targetGroups: []
    });
    const [editingId, setEditingId] = useState(null);

    // File State
    const [visualFile, setVisualFile] = useState(null);
    const [priceFiles, setPriceFiles] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Quick Generator State (Main Page)
    const [quickVisualFile, setQuickVisualFile] = useState(null);
    const [quickPriceFiles, setQuickPriceFiles] = useState([]);
    const [quickMarkup, setQuickMarkup] = useState(20);
    const quickVisualInputRef = useRef(null);
    const quickPriceInputRef = useRef(null);

    const visualInputRef = useRef(null);
    const priceInputRef = useRef(null);



    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/campaigns');
            setCampaigns(res.data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
            // alert('Erro ao carregar campanhas.'); // Suppress initial load error alert for smoother UX if API is waking up
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const toggleActivation = async (campaign) => {
        if (!campaign.isActive) {
            // Activating
        } else {
            // Deactivating
        }

        // Optimistic toggle
        const newStatus = !campaign.isActive;

        try {
            setCampaigns(prev => prev.map(c =>
                c.id === campaign.id ? { ...c, isActive: newStatus } : c
            ));

            await api.put(`/campaigns/${campaign.id}`, { isActive: newStatus });
            fetchCampaigns();
        } catch (error) {
            console.error('Error toggling campaign', error);
            alert('Erro ao alterar status da campanha.');
            fetchCampaigns();
        }
    };

    const handleEnterSystem = () => {
        // Clear any selected campaign (show all)
        localStorage.removeItem('selectedCampaignId');
        localStorage.removeItem('selectedCampaignName');
        router.push('/dashboard');
    };

    const handleEnterCampaign = (campaign) => {
        // Save selected campaign to localStorage
        localStorage.setItem('selectedCampaignId', campaign.id);
        localStorage.setItem('selectedCampaignName', campaign.name);
        router.push('/dashboard');
    };

    const handleLogout = () => {
        router.push('/login');
    };

    const handleVisualFileSelect = (e) => {
        if (e.target.files?.[0]) setVisualFile(e.target.files[0]);
    };

    const handlePriceFileSelect = (e) => {
        if (e.target.files?.length) {
            const newFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
            setPriceFiles(prev => [...prev, ...newFiles]);
        }
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let response;

            // 1. Save Basic Info
            const payload = { ...formData };
            let campaignsList = [...campaigns];
            let targetId = editingId;

            if (editingId) {
                const res = await api.put(`/campaigns/${editingId}`, payload);
                campaignsList = campaigns.map(c => c.id === editingId ? res.data : c);
            } else {
                const res = await api.post('/campaigns', payload);
                campaignsList = [res.data, ...campaigns];
                targetId = res.data.id;
            }
            setCampaigns(campaignsList);

            // Upload Files
            if (visualFile || priceFiles.length > 0) {
                const uploadData = new FormData();
                if (visualFile) uploadData.append('pdf', visualFile);
                if (priceFiles.length > 0) priceFiles.forEach(f => uploadData.append('pricePdf', f));
                uploadData.append('markupPercentage', formData.markupPercentage);

                await api.post(`/campaigns/${targetId}/upload`, uploadData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fetchCampaigns(); // Refresh to show file status
            }

            alert(editingId ? 'Campanha atualizada!' : 'Campanha criada!');
            closeModal();
            fetchCampaigns();

        } catch (error) {
            console.error('Error saving campaign', error);
            alert('Erro ao salvar campanha: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleGenerate = async (campaignId) => {
        if (!confirm('Deseja baixar o PDF gerado com Markup?')) return;

        setIsGenerating(true);
        try {
            const response = await api.post(`/campaigns/${campaignId}/generate`, {}, {
                responseType: 'blob',
                timeout: 300000
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `catalogo-markup-campanha-${campaignId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            alert('Download iniciado!');
        } catch (error) {
            console.error('Generation failed', error);
            alert('Falha na geração do PDF: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEdit = (c) => {
        setEditingId(c.id);
        setFormData({
            name: c.name,
            isActive: c.isActive,
            markupPercentage: c.markupPercentage || 0,
            targetGroups: c.targetGroups || []
        });
        setVisualFile(null);
        setPriceFiles([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '', isActive: false, markupPercentage: 0, targetGroups: [] });
        setEditingId(null);
        setVisualFile(null);
        setPriceFiles([]);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
        try {
            await api.delete(`/campaigns/${id}`);
            alert('Campanha excluída com sucesso!');
            fetchCampaigns();
        } catch (error) {
            console.error('Error deleting campaign', error);
            alert('Erro ao excluir campanha: ' + (error.response?.data?.error || error.message));
        }
    };

    // Derived State
    // Support multiple active campaigns
    const activeCampaigns = campaigns.filter(c => c.isActive);
    const inactiveCampaigns = campaigns.filter(c => !c.isActive);

    // For Hero display, just show the most recent active or the first one found
    const heroCampaign = activeCampaigns.length > 0 ? activeCampaigns[0] : null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-12 px-6 md:px-12 pt-8">
            <Head>
                <title>Portal de Campanhas</title>
            </Head>

            <div className="max-w-7xl mx-auto w-full">
                {/* Header - Portal Style (Logo + Actions) */}
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange border border-brand-orange/20">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Portal de Campanhas</h1>
                            <p className="text-gray-500 text-sm">Selecione a coleção ativa para trabalhar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { closeModal(); setIsModalOpen(true); }}
                            className="text-gray-600 hover:text-gray-900 hover:bg-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <Plus size={18} /> Nova Campanha
                        </button>
                        <div className="h-6 w-px bg-gray-300"></div>
                        <button
                            onClick={handleLogout}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                        >
                            <LogOut size={18} /> Sair
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <Loader2 className="animate-spin mx-auto text-gray-400 mb-4" size={40} />
                        <p className="text-gray-500">Carregando campanhas...</p>
                    </div>
                ) : (
                    <div className="space-y-12">

                        {/* HERO SECTION - Active Campaign (Focus) */}
                        {activeCampaigns.length > 0 ? (
                            <section className="animate-slideUp space-y-6">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Star size={16} className="text-brand-orange fill-brand-orange" />
                                    {activeCampaigns.length > 1 ? `${activeCampaigns.length} Campanhas Ativas` : 'Campanha Selecionada'}
                                </h2>

                                {/* Loop through ALL active campaigns */}
                                {activeCampaigns.map((campaign, index) => (
                                    <div key={campaign.id} className={`relative overflow-hidden bg-white rounded-3xl shadow-xl border border-brand-orange/20 ring-4 ring-orange-50/50 group ${index > 0 ? 'mt-4' : ''}`}>
                                        {/* Abstract Gradient */}
                                        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-orange-50 via-white/0 to-transparent opacity-60" />

                                        <div className="relative p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="flex-1 space-y-4">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide border border-green-200">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativa Agora
                                                </div>
                                                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
                                                    {campaign.name}
                                                </h2>
                                                <div className="flex items-center gap-4 text-gray-600 flex-wrap">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                                        <Database size={16} className="text-gray-400" />
                                                        <span className="text-sm">Markup: <span className="font-bold text-gray-900">{campaign.markupPercentage}%</span></span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(campaign.targetGroups && campaign.targetGroups.length > 0) ?
                                                            campaign.targetGroups.map(gid => {
                                                                const gName = TARGET_GROUPS.find(bg => bg.id === gid)?.name || 'Grupo';
                                                                return (
                                                                    <span key={gid} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-100">
                                                                        <Users size={12} /> {gName}
                                                                    </span>
                                                                )
                                                            })
                                                            :
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded border border-gray-100">
                                                                Global (Todos)
                                                            </span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Main Action: ENTER */}
                                            <div className="flex flex-col items-center gap-3 shrink-0 w-full md:w-auto">
                                                <button
                                                    onClick={() => handleEnterCampaign(campaign)}
                                                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-brand-orange hover:bg-orange-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-orange-200 transition-all hover:-translate-y-1 hover:shadow-orange-300"
                                                >
                                                    Entrar na Campanha <ArrowRight size={20} />
                                                </button>

                                                <div className="flex gap-2">
                                                    {campaign.visualPdfPath && (
                                                        <button
                                                            onClick={() => handleGenerate(campaign.id)}
                                                            disabled={isGenerating}
                                                            className="text-gray-500 hover:text-brand-orange text-sm font-medium px-3 py-1.5 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                                            Baixar PDF
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(campaign)}
                                                        className="text-gray-500 hover:text-blue-600 text-sm font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <Edit3 size={14} /> Editar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* QUICK CATALOG GENERATOR SECTION */}
                                <div className="mt-8 bg-orange-50 border border-orange-200 rounded-3xl p-8 relative overflow-hidden">
                                    {/* Background Decor */}
                                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-orange-100/50 to-transparent pointer-events-none" />

                                    <div className="flex flex-col items-center justify-center text-center gap-4 mb-8 relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 text-white mb-1">
                                            <FileText size={32} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-orange-900">Gerar Catálogo com Markup</h2>
                                            <p className="text-orange-700/80 text-base max-w-2xl mx-auto">Faça upload de um PDF e aplique uma porcentagem de markup nos preços</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_100px_auto] gap-4 items-end relative z-10 max-w-5xl mx-auto">

                                        {/* Visual PDF Input - MATCHING CATALOG STYLE */}
                                        <div>
                                            <label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                                                <Upload size={14} /> Catálogo (Fotos)
                                            </label>
                                            <input
                                                type="file"
                                                ref={quickVisualInputRef}
                                                accept=".pdf"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) setQuickVisualFile(e.target.files[0]);
                                                }}
                                                className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-sm font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-orange-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                                            />
                                            <p className="text-xs text-orange-600/60 mt-1">Arquivo com imagens e códigos</p>
                                        </div>

                                        {/* Price PDFs Input - MATCHING CATALOG STYLE */}
                                        <div>
                                            <label className="block text-sm font-bold text-orange-900 mb-2 flex items-center gap-2">
                                                <Database size={14} /> Tabela de Preços (Múltiplos)
                                            </label>

                                            {/* File List */}
                                            {quickPriceFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {quickPriceFiles.map((f, i) => (
                                                        <div key={i} className="bg-white border border-orange-200 rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-orange-800">
                                                            <Paperclip size={10} />
                                                            <span className="truncate max-w-[80px]">{f.name}</span>
                                                            <button onClick={() => setQuickPriceFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><X size={10} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div
                                                onClick={() => quickPriceInputRef.current?.click()}
                                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (e.dataTransfer.files?.length > 0) {
                                                        const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
                                                        setQuickPriceFiles(prev => [...prev, ...newFiles]);
                                                    }
                                                }}
                                                className="bg-white/60 border-2 border-dashed border-orange-300 rounded-xl px-4 py-3 cursor-pointer hover:bg-white hover:border-orange-500 transition-all flex flex-col items-center justify-center gap-1 text-orange-600"
                                            >
                                                <input
                                                    type="file"
                                                    hidden
                                                    ref={quickPriceInputRef}
                                                    accept=".pdf"
                                                    multiple
                                                    onChange={(e) => {
                                                        if (e.target.files?.length) {
                                                            setQuickPriceFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                                            e.target.value = ''; // Reset
                                                        }
                                                    }}
                                                />
                                                <Paperclip size={20} />
                                                <span className="text-sm font-bold">Arquivos</span>
                                            </div>
                                        </div>

                                        {/* Markup Input */}
                                        <div>
                                            <label className="block text-sm font-bold text-orange-900 mb-2">Markup %</label>
                                            <input
                                                type="number"
                                                value={quickMarkup}
                                                onChange={(e) => setQuickMarkup(e.target.value)}
                                                className="w-full px-2 py-3 bg-white border-2 border-orange-200 rounded-xl text-center font-bold text-gray-800 focus:border-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Generate Button */}
                                        <button
                                            onClick={async () => {
                                                if (!quickVisualFile && !heroCampaign.visualPdfPath) {
                                                    alert('Por favor, selecione um Catálogo Visual (PDF) ou certifique-se que a campanha já tem um.');
                                                    return;
                                                }

                                                setIsGenerating(true);
                                                try {
                                                    const formData = new FormData();
                                                    formData.append('campaignId', heroCampaign.id);
                                                    if (quickVisualFile) formData.append('pdf', quickVisualFile);

                                                    if (quickPriceFiles.length > 0) {
                                                        quickPriceFiles.forEach(f => formData.append('pricePdf', f));
                                                    }

                                                    formData.append('markupPercentage', quickMarkup);

                                                    const response = await api.post('/catalog/generate-markup-upload', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' },
                                                        timeout: 600000 // 10 minutes for AI processing
                                                    });

                                                    // Handle JSON response with download URL
                                                    if (response.data.success && response.data.downloadUrl) {
                                                        const fullUrl = `https://n8n-apintegromat.r954jc.easypanel.host${response.data.downloadUrl}`;

                                                        // Force download using fetch + blob (bypasses browser PDF viewer)
                                                        try {
                                                            const pdfResponse = await fetch(fullUrl);
                                                            const blob = await pdfResponse.blob();
                                                            const blobUrl = window.URL.createObjectURL(blob);

                                                            const link = document.createElement('a');
                                                            link.href = blobUrl;
                                                            link.download = response.data.filename || 'catalogo_markup.pdf';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            link.remove();
                                                            window.URL.revokeObjectURL(blobUrl);
                                                        } catch (downloadError) {
                                                            // Fallback: open in new tab if fetch fails
                                                            window.open(fullUrl, '_blank');
                                                        }

                                                        alert(`Gerado com Sucesso! ${response.data.pricesUpdated} preços atualizados.`);
                                                    } else {
                                                        throw new Error('Resposta inválida do servidor');
                                                    }

                                                } catch (error) {
                                                    console.error(error);
                                                    alert('Erro ao gerar catálogo: ' + (error.response?.data?.error || error.message));
                                                } finally {
                                                    setIsGenerating(false);
                                                }
                                            }}
                                            disabled={isGenerating}
                                            className="h-[52px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl px-6 shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isGenerating ? <Loader2 className="animate-spin" /> : 'Gerar PDF'}
                                        </button>

                                    </div>
                                </div>

                            </section >
                        ) : (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                                <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
                                <h3 className="text-lg font-bold text-red-800">Nenhuma Campanha Ativa</h3>
                                <p className="text-red-600">Por favor, ative uma coleção abaixo para entrar no sistema.</p>
                            </div>
                        )
                        }

                        {/* GRID SECTION - All Campaigns (Active & Inactive mixed or just inactive?) 
                            The design requested shows "Outras". Use logic to show ALL except Hero, OR list Inactive separately.
                            Given "Concurrent", maybe show LIST of EVERYTHING? 
                            Let's keep "Outras" but clarify logic. Hero shows "Primary". 
                            Actually, let's show ALL campaigns in the grid logic (status toggle makes sense everywhere).
                            But we don't want to duplicate Hero. 
                            If multiple active, Hero shows the FIRST one. The others should appear below?
                            Let's exclude Hero from the generic grid to avoid dupes.
                        */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                                Gerenciar Campanhas
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {campaigns.filter(c => c.id !== (heroCampaign?.id)).map(c => (
                                    <div key={c.id} className={`group bg-white rounded-2xl p-5 border ${c.isActive ? 'border-green-400 ring-2 ring-green-50' : 'border-gray-200/60'} shadow-sm hover:shadow-xl hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full relative overflow-hidden`}>

                                        <div className="absolute top-0 right-0 p-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                            <button onClick={() => handleEdit(c)} className="p-1.5 bg-white/90 shadow rounded-md hover:text-blue-500 text-gray-400"><Edit3 size={14} /></button>
                                            <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-white/90 shadow rounded-md hover:text-red-500 text-gray-400"><Trash2 size={14} /></button>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${c.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <FileText size={20} />
                                                </div>
                                                {c.isActive && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded border border-green-200">Ativa</span>}
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-800 mb-1 leading-snug">{c.name}</h3>

                                            <div className="flex flex-wrap gap-2 mb-4 mt-2">
                                                {(c.targetGroups && c.targetGroups.length > 0) ?
                                                    c.targetGroups.map(gid => (
                                                        <span key={gid} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold rounded border border-gray-100">
                                                            {TARGET_GROUPS.find(bg => bg.id === gid)?.name.replace('Grupo ', '') || 'VIP/Colet'}
                                                        </span>
                                                    ))
                                                    :
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[10px] rounded border border-gray-100">Global</span>
                                                }
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                                                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                                    <Database size={12} /> {c.markupPercentage || 0}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-auto">
                                            <button
                                                onClick={() => toggleActivation(c)}
                                                className={`w-full py-2.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${c.isActive ? 'border-red-100 text-red-500 hover:bg-red-50' : 'border-gray-100 text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50'}`}
                                            >
                                                {c.isActive ? (
                                                    <><ToggleRight size={18} /> Desativar</>
                                                ) : (
                                                    <><ToggleLeft size={18} /> Ativar</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>


                    </div >
                )}
            </div >

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">{editingId ? 'Editar Campanha' : 'Nova Campanha'}</h2>
                                    <p className="text-gray-400 text-sm mt-1">Preencha os dados e anexe os arquivos.</p>
                                </div>
                                <button onClick={closeModal} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar">
                                <form id="campaignForm" onSubmit={handleSubmit} className="space-y-8">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Coleção</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all"
                                                placeholder="Ex: Primavera/Verão 2026"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Grupos Alvo</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {TARGET_GROUPS.map(group => (
                                                <label key={group.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${formData.targetGroups.includes(group.id) ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.targetGroups.includes(group.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>
                                                        {formData.targetGroups.includes(group.id) && <CheckCircle size={14} className="text-white" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={formData.targetGroups.includes(group.id)}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                targetGroups: isChecked
                                                                    ? [...prev.targetGroups, group.id]
                                                                    : prev.targetGroups.filter(id => id !== group.id)
                                                            }));
                                                        }}
                                                    />
                                                    <span className={`text-sm font-medium ${formData.targetGroups.includes(group.id) ? 'text-blue-900' : 'text-gray-600'}`}>
                                                        {group.name}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">Selecione para qual grupo esta campanha será válida. Pode selecionar ambos.</p>
                                    </div>

                                    {/* Catalog Configuration */}
                                    <div className="border-t border-gray-100 pt-8">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                            <Database size={20} className="text-blue-500" />
                                            Arquivos & Preços
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-6">Configure o catálogo base e as tabelas de custo.</p>

                                        <div className="mb-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Markup Padrão (%)</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-orange"
                                                    value={formData.markupPercentage}
                                                    onChange={e => setFormData({ ...formData, markupPercentage: e.target.value })}
                                                />
                                                <span className="text-sm text-gray-500">% sobre o custo</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            {/* Visual PDF */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-gray-700">Catálogo Visual (PDF)</label>
                                                <div
                                                    onClick={() => visualInputRef.current?.click()}
                                                    className={`group border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${visualFile ? 'border-green-400 bg-green-50/50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
                                                >
                                                    <input type="file" hidden ref={visualInputRef} accept=".pdf" onChange={handleVisualFileSelect} />
                                                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-colors ${visualFile ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:text-blue-500'}`}>
                                                        <FileText size={24} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 block truncate">
                                                        {visualFile ? visualFile.name : 'Clique para carregar o Catálogo Visual'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 mt-1 block">PDF até 100MB</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-8 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/80 backdrop-blur rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    form="campaignForm"
                                    className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg font-bold transition-all hover:scale-105 active:scale-95"
                                >
                                    {editingId ? 'Salvar Alterações' : 'Criar Campanha'}
                                </button>
                            </div>
                        </div >
                    </div >
                )
            }
        </div >
    );
}

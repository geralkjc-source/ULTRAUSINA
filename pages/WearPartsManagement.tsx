import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  X,
  Save,
  Calendar,
  Layers
} from 'lucide-react';
import { WearPart, WearPartStatus } from '../types';
import { useLanguage } from '../LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

const WearPartsManagement: React.FC = () => {
  const { t } = useLanguage();
  const [parts, setParts] = useState<WearPart[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<WearPart | null>(null);
  const [editingPart, setEditingPart] = useState<WearPart | null>(null);
  const [partForm, setPartForm] = useState<Partial<WearPart>>({
    code: '',
    name: '',
    equipment: '',
    installationDate: Date.now(),
    expectedLifespanDays: 90,
    status: 'good',
    observations: '',
    location: '',
    requiredQuantity: 0,
    currentQuantity: 0,
    category: ''
  });

  // Load data from localStorage
  useEffect(() => {
    const savedParts = localStorage.getItem('app_wear_parts');
    if (savedParts) setParts(JSON.parse(savedParts));
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('app_wear_parts', JSON.stringify(parts));
  }, [parts]);

  const handleAddPart = () => {
    if (!partForm.code || !partForm.name || !partForm.equipment) return;
    
    const newPart: WearPart = {
      id: Date.now().toString(),
      code: partForm.code!,
      name: partForm.name!,
      equipment: partForm.equipment!,
      installationDate: partForm.installationDate || Date.now(),
      expectedLifespanDays: partForm.expectedLifespanDays || 90,
      status: (partForm.status as WearPartStatus) || 'good',
      observations: partForm.observations,
      synced: false,
      location: partForm.location,
      requiredQuantity: partForm.requiredQuantity || 0,
      currentQuantity: partForm.currentQuantity || 0,
      usedQuantity: 0,
      category: partForm.category,
      history: [{ timestamp: Date.now(), action: 'add' }]
    };

    setParts([...parts, newPart]);
    setShowAddModal(false);
    setPartForm({ code: '', name: '', equipment: '', installationDate: Date.now(), expectedLifespanDays: 90, status: 'good', observations: '', location: '', requiredQuantity: 0, currentQuantity: 0, usedQuantity: 0, category: '' });
  };

  const handleUsePart = (partId: string) => {
    setParts(parts.map(p => {
      if (p.id === partId && (p.currentQuantity || 0) > 0) {
        return {
          ...p,
          currentQuantity: (p.currentQuantity || 0) - 1,
          usedQuantity: (p.usedQuantity || 0) + 1,
          history: [...(p.history || []), { timestamp: Date.now(), action: 'use' }]
        };
      }
      return p;
    }));
  };

  const handleReplacePart = (partId: string) => {
    setParts(parts.map(p => {
      if (p.id === partId) {
        return {
          ...p,
          status: 'replaced',
          installationDate: Date.now(),
          history: [...(p.history || []), { timestamp: Date.now(), action: 'replace' }]
        };
      }
      return p;
    }));
  };

  const handleEditPart = () => {
    if (!editingPart) return;
    setParts(parts.map(p => p.id === editingPart.id ? editingPart : p));
    setShowEditModal(false);
    setEditingPart(null);
  };

  const calculateRemainingLife = (installationDate: number, lifespanDays: number) => {
    const expirationDate = installationDate + (lifespanDays * 24 * 60 * 60 * 1000);
    const remainingMs = expirationDate - Date.now();
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return remainingDays;
  };

  const getStatusColor = (status: WearPartStatus, remainingDays: number) => {
    if (status === 'replaced') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (remainingDays <= 0) return 'bg-red-100 text-red-700 border-red-200';
    if (remainingDays <= 15) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getStatusIcon = (status: WearPartStatus, remainingDays: number) => {
    if (status === 'replaced') return <RefreshCw size={14} />;
    if (remainingDays <= 0) return <AlertTriangle size={14} />;
    if (remainingDays <= 15) return <Clock size={14} />;
    return <CheckCircle2 size={14} />;
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          part.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          part.equipment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || part.status === statusFilter;
    const matchesEquipment = equipmentFilter === 'all' || part.equipment === equipmentFilter;
    return matchesSearch && matchesStatus && matchesEquipment;
  });

  const equipments = Array.from(new Set(parts.map(p => p.equipment)));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('wearParts.title')}</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{t('wearParts.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus size={16} /> {t('wearParts.addPart')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder={t('wearParts.searchPart')} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none text-sm font-black uppercase focus:bg-white focus:border-blue-500 transition-all shadow-inner" 
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500"
          >
            <option value="all">{t('wearParts.allStatus')}</option>
            <option value="good">{t('wearParts.good')}</option>
            <option value="warning">{t('wearParts.warning')}</option>
            <option value="critical">{t('wearParts.critical')}</option>
            <option value="replaced">{t('wearParts.replaced')}</option>
          </select>
          <select 
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:border-blue-500"
          >
            <option value="all">{t('wearParts.allEquipments')}</option>
            {equipments.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParts.length > 0 ? filteredParts.map(part => {
          const remainingDays = calculateRemainingLife(part.installationDate, part.expectedLifespanDays);
          return (
            <motion.div 
              layout
              key={part.id} 
              className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{part.code}</span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{part.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <button onClick={() => { setEditingPart(part); setShowEditModal(true); }}>
                      <Settings size={12} className="hover:text-blue-600 transition-colors" />
                    </button>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{part.equipment}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-tight ${getStatusColor(part.status, remainingDays)}`}>
                  {getStatusIcon(part.status, remainingDays)}
                  {remainingDays <= 0 ? t('wearParts.expired') : `${remainingDays} ${t('wearParts.days')}`}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} />
                    <span className="text-[10px] font-black uppercase">{t('wearParts.installationDate')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{new Date(part.installationDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase">{t('wearParts.expectedLifespan')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{part.expectedLifespanDays} {t('wearParts.days')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-[10px] font-black uppercase">{t('wearParts.location')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{part.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-[10px] font-black uppercase">{t('wearParts.category')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{part.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-[10px] font-black uppercase">{t('wearParts.currentQuantity')} / {t('wearParts.requiredQuantity')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{part.currentQuantity} / {part.requiredQuantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-[10px] font-black uppercase">{t('wearParts.usedQuantity')}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-700">{part.usedQuantity || 0}</span>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                    <span>{t('wearParts.remainingLife')}</span>
                    <span>{Math.max(0, Math.min(100, Math.round((remainingDays / part.expectedLifespanDays) * 100)))}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${remainingDays <= 0 ? 'bg-red-500' : remainingDays <= 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(0, Math.min(100, (remainingDays / part.expectedLifespanDays) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleUsePart(part.id)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {t('wearParts.usePart')}
                </button>
                <button 
                  onClick={() => handleReplacePart(part.id)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> {t('wearParts.replaced')}
                </button>
                <button 
                  onClick={() => {
                    setSelectedPart(part);
                    setShowHistoryModal(true);
                  }}
                  className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                >
                  <Layers size={16} />
                </button>
              </div>
            </motion.div>
          );
        }) : (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto">
              <Settings size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('wearParts.noParts')}</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('wearParts.addPart')}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.code')}</label>
                    <input 
                      type="text" 
                      value={partForm.code}
                      onChange={(e) => setPartForm({ ...partForm, code: e.target.value.toUpperCase() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.name')}</label>
                    <input 
                      type="text" 
                      value={partForm.name}
                      onChange={(e) => setPartForm({ ...partForm, name: e.target.value.toUpperCase() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.equipment')}</label>
                    <input 
                      type="text" 
                      value={partForm.equipment}
                      onChange={(e) => setPartForm({ ...partForm, equipment: e.target.value.toUpperCase() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.location')}</label>
                    <input 
                      type="text" 
                      value={partForm.location}
                      onChange={(e) => setPartForm({ ...partForm, location: e.target.value.toUpperCase() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.requiredQuantity')}</label>
                    <input 
                      type="number" 
                      value={partForm.requiredQuantity}
                      onChange={(e) => setPartForm({ ...partForm, requiredQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.currentQuantity')}</label>
                    <input 
                      type="number" 
                      value={partForm.currentQuantity}
                      onChange={(e) => setPartForm({ ...partForm, currentQuantity: parseInt(e.target.value) || 0 })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.category')}</label>
                    <input 
                      type="text" 
                      value={partForm.category}
                      onChange={(e) => setPartForm({ ...partForm, category: e.target.value.toUpperCase() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.installationDate')}</label>
                    <input 
                      type="date" 
                      onChange={(e) => setPartForm({ ...partForm, installationDate: new Date(e.target.value).getTime() })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.expectedLifespan')}</label>
                    <input 
                      type="number" 
                      value={partForm.expectedLifespanDays}
                      onChange={(e) => setPartForm({ ...partForm, expectedLifespanDays: parseInt(e.target.value) || 0 })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.observations')}</label>
                  <textarea 
                    value={partForm.observations}
                    onChange={(e) => setPartForm({ ...partForm, observations: e.target.value })}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>

              <button 
                onClick={handleAddPart}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> {t('wearParts.savePart')}
              </button>
            </motion.div>
          </div>
        )}

        {showHistoryModal && selectedPart && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('wearParts.history')} - {selectedPart.name}</h2>
                <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {selectedPart.history?.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <span className="text-xs font-black uppercase text-slate-600">{t(`wearParts.${entry.action}`)}</span>
                    <span className="text-xs font-black text-slate-400">{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && editingPart && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('wearParts.editPart')}</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.name')}</label>
                  <input 
                    type="text" 
                    value={editingPart.name}
                    onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value.toUpperCase() })}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('wearParts.currentQuantity')}</label>
                  <input 
                    type="number" 
                    value={editingPart.currentQuantity}
                    onChange={(e) => setEditingPart({ ...editingPart, currentQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black uppercase outline-none focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>

              <button 
                onClick={handleEditPart}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> {t('wearParts.savePart')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WearPartsManagement;

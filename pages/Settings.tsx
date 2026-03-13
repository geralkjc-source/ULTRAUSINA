import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Mail, Plus, X } from 'lucide-react';
import { backendService } from '../services/backendService';

const Settings: React.FC = () => {
  const [emails, setEmails] = useState<string>('');
  const [ccEmails, setCcEmails] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await backendService.getConfig();
        setEmails(config.emailRecipients || '');
        setCcEmails(config.emailCc || '');
      } catch (error) {
        console.error('Error loading config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await backendService.saveConfig({ emailRecipients: emails, emailCc: ccEmails });
      setStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Configurações</h1>
          <p className="text-slate-500 text-sm">Gerencie as preferências da plataforma</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Mail size={20} className="text-blue-500" />
            <h2>Destinatários de E-mail</h2>
          </div>
          
          <p className="text-slate-500 text-sm">
            Insira os e-mails que devem receber os relatórios de turno. 
            Separe múltiplos e-mails por vírgula.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Lista de E-mails
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="exemplo1@gmail.com, exemplo2@gmail.com"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all min-h-[120px] font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              CC (Com Cópia)
            </label>
            <textarea
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="copia1@gmail.com, copia2@gmail.com"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all min-h-[80px] font-mono text-sm"
            />
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-2xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {status.message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <Save size={18} /> Salvar Configurações
            </>
          )}
        </button>
      </div>
      
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <h3 className="text-slate-900 font-bold mb-2">Dica</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          Os relatórios são enviados automaticamente ao clicar no botão "PDF Turno" na lista de pendências. 
          Certifique-se de que os e-mails estão corretos para garantir o recebimento.
        </p>
      </div>
    </div>
  );
};

export default Settings;

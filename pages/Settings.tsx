import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Mail, Plus, X, ShieldAlert, Languages } from 'lucide-react';
import { backendService } from '../services/backendService';
import { generateAuditPDFBase64, generateDisciplineAuditPDFBase64 } from '../services/pdfExport';
import { useLanguage } from '../LanguageContext';

const Settings: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [emails, setEmails] = useState<string>('');
  const [ccEmails, setCcEmails] = useState<string>('');
  const [disciplineEmails, setDisciplineEmails] = useState<Record<string, string>>({
    'MECÂNICA': '',
    'ELÉTRICA': '',
    'INSTRUMENTAÇÃO': '',
    'OPERAÇÃO': ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [isSendingReports, setIsSendingReports] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await backendService.getConfig();
        setEmails(config.emailRecipients || '');
        setCcEmails(config.emailCc || '');
        if (config.disciplineEmails) {
          setDisciplineEmails(prev => ({ ...prev, ...config.disciplineEmails }));
        }
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
      await backendService.saveConfig({ 
        emailRecipients: emails, 
        emailCc: ccEmails,
        disciplineEmails: disciplineEmails
      });
      setStatus({ type: 'success', message: t('settings.saveSuccess') });
    } catch (error) {
      setStatus({ type: 'error', message: t('settings.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!emails) {
      setStatus({ type: 'error', message: t('settings.testEmailPlaceholder') });
      return;
    }

    setTesting(true);
    setStatus(null);
    try {
      await backendService.sendEmail({
        subject: t('settings.testEmailSubject'),
        text: t('settings.testEmailBody').replace('{date}', new Date().toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US')),
        recipients: emails,
        carbonCopy: ccEmails
      });
      setStatus({ type: 'success', message: t('settings.testEmailSuccess') });
    } catch (error: any) {
      console.error('Test email error:', error);
      setStatus({ type: 'error', message: `${t('settings.testEmailError')}${error.message}` });
    } finally {
      setTesting(false);
    }
  };

  const sendReports = async (reason: string, reportType: 'all' | 'master' | 'discipline' = 'all') => {
    setIsSendingReports(true);
    setStatus(null);
    try {
      console.log(`Sending ${reason} Audit PDF (${reportType})`);
      const dateStr = new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US');
      const pendingItems = await backendService.getPendingItems();
      
      // 1. Enviar Auditoria Geral (Master)
      if (reportType === 'all' || reportType === 'master') {
        const base64Master = generateAuditPDFBase64(pendingItems, `${t('settings.auditEmailSubject').replace('{reason}', reason)}`.toUpperCase());
        
        const masterEmailBody = `${t('settings.auditEmailBody').replace('{reason}', reason)}
 
${t('settings.auditEmailDetails').replace('{reason}', reason).replace('{date}', dateStr)}

${t('settings.auditEmailFooter')}`;

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `Auditoria Geral Ultrafino`,
            text: masterEmailBody,
            attachment: {
              filename: `Auditoria_${dateStr.replace(/\//g, '-')}.pdf`,
              content: base64Master
            }
          })
        });
      }

      // 2. Enviar Carga Acumulada por Disciplina para Gestores
      if (reportType === 'all' || reportType === 'discipline') {
        try {
          const config = await backendService.getConfig();
          if (config.disciplineEmails) {
            for (const [discipline, email] of Object.entries(config.disciplineEmails)) {
              if (email && email.trim() !== "") {
                const itemsForDiscipline = pendingItems.filter(i => i.discipline === discipline && i.status === 'aberto');
                
                if (itemsForDiscipline.length > 0) {
                  const base64Disc = generateDisciplineAuditPDFBase64(pendingItems, discipline);
                  const emailBody = `${t('settings.auditEmailBody').replace('{reason}', discipline)}
 
${t('settings.auditEmailDetails').replace('{reason}', discipline).replace('{date}', dateStr)}

${t('settings.auditEmailFooter')}`;

                  await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: email,
                      cc: "",
                      subject: `Carga Acumulada Ultrafino - ${discipline.toUpperCase()} - ${dateStr}`,
                      text: emailBody,
                      attachment: {
                        filename: `Carga_Acumulada_${discipline}_${dateStr.replace(/\//g, '-')}.pdf`,
                        content: base64Disc
                      }
                    })
                  });
                }
              }
            }
          }
        } catch (configErr) {
          console.error("Error sending discipline emails:", configErr);
          throw configErr;
        }
      }
      
      setStatus({ type: 'success', message: t('settings.saveSuccess') });
    } catch (error) {
      console.error("Error sending reports:", error);
      setStatus({ type: 'error', message: t('settings.saveError') });
    } finally {
      setIsSendingReports(false);
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
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('settings.title')}</h1>
          <p className="text-slate-500 text-sm">{t('managePreferences')}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        {/* Language Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Languages size={20} className="text-blue-500" />
            <h2>{t('language')}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('pt')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${language === 'pt' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
            >
              {t('portuguese')}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${language === 'en' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
            >
              {t('english')}
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Mail size={20} className="text-blue-500" />
            <h2>{t('settings.emailSection')}</h2>
          </div>
          
          <p className="text-slate-500 text-sm">
            {t('settings.recipients')}
          </p>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              {t('settings.recipients')}
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
              {t('settings.cc')}
            </label>
            <textarea
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="copia1@gmail.com, copia2@gmail.com"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all min-h-[80px] font-mono text-sm"
            />
          </div>
          
          <div className="pt-2">
            <button 
              disabled={isSendingReports} 
              onClick={() => sendReports("Manual", "master")} 
              className={`flex items-center justify-center gap-2 py-3 px-6 text-white rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 ${isSendingReports ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <ShieldAlert size={16} /> {isSendingReports ? t('settings.sending') : t('settings.sendMasterOnly')}
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Mail size={20} className="text-emerald-500" />
            <h2>{t('settings.disciplineEmails')}</h2>
          </div>
          <p className="text-slate-500 text-sm">
            {t('settings.disciplineEmails')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(disciplineEmails).map((discipline) => (
              <div key={discipline} className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  {discipline}
                </label>
                <input
                  type="email"
                  value={disciplineEmails[discipline]}
                  onChange={(e) => setDisciplineEmails(prev => ({ ...prev, [discipline]: e.target.value }))}
                  placeholder={`E-mail Gestor ${discipline}`}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all text-sm"
                />
              </div>
            ))}
          </div>
          
          <div className="pt-2">
            <button 
              disabled={isSendingReports} 
              onClick={() => sendReports("Manual", "discipline")} 
              className={`flex items-center justify-center gap-2 py-3 px-6 text-white rounded-xl font-black text-[10px] uppercase shadow-md transition-all active:scale-95 ${isSendingReports ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              <Mail size={16} /> {isSendingReports ? t('settings.sending') : t('settings.sendDisciplinesOnly')}
            </button>
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-2xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {status.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            disabled={saving || testing}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save size={18} /> {t('saveSettings')}
              </>
            )}
          </button>

          <button
            onClick={handleTestEmail}
            disabled={saving || testing}
            className="flex-1 py-4 bg-white border-2 border-slate-100 hover:border-blue-500 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <>
                <Mail size={18} className="text-blue-600" /> {t('testEmail')}
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <h3 className="text-slate-900 font-bold mb-2">{language === 'pt' ? 'Dica' : 'Tip'}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          {language === 'pt' 
            ? 'O envio de e-mails é realizado automaticamente (Segundas-feiras e fim do mês) para os destinatários configurados acima.'
            : 'Email sending is performed automatically (Mondays and end of the month) to the recipients configured above.'}
        </p>
      </div>
    </div>
  );
};

export default Settings;

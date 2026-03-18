import { Report, QualityReport, PendingItem, OperationalEvent } from '../types';

const API_BASE = '/api';

export const backendService = {
  // Reports
  async getReports(): Promise<Report[]> {
    const response = await fetch(`${API_BASE}/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
  },

  async saveReport(report: Report): Promise<Report> {
    const response = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error('Failed to save report');
    return response.json();
  },

  // Quality Reports
  async getQualityReports(): Promise<QualityReport[]> {
    const response = await fetch(`${API_BASE}/quality-reports`);
    if (!response.ok) throw new Error('Failed to fetch quality reports');
    return response.json();
  },

  async saveQualityReport(report: QualityReport): Promise<QualityReport> {
    const response = await fetch(`${API_BASE}/quality-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!response.ok) throw new Error('Failed to save quality report');
    return response.json();
  },

  // Pending Items
  async getPendingItems(): Promise<PendingItem[]> {
    const response = await fetch(`${API_BASE}/pending-items`);
    if (!response.ok) throw new Error('Failed to fetch pending items');
    return response.json();
  },

  async savePendingItem(item: PendingItem): Promise<PendingItem> {
    const response = await fetch(`${API_BASE}/pending-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to save pending item');
    return response.json();
  },

  async updatePendingItem(id: string, item: Partial<PendingItem>): Promise<PendingItem> {
    const response = await fetch(`${API_BASE}/pending-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to update pending item');
    return response.json();
  },

  async sync(payload: any): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.status === 405 || response.status === 404) {
        throw new Error('BACKEND_UNAVAILABLE');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Erro do Servidor: ${response.status}`);
      }
      
      return response.json();
    } catch (error: any) {
      if (error.message === 'BACKEND_UNAVAILABLE') throw error;
      console.error('Sync service error:', error);
      throw error;
    }
  },

  // Operational Events
  async getOperationalEvents(): Promise<OperationalEvent[]> {
    const response = await fetch(`${API_BASE}/operational-events`);
    if (!response.ok) throw new Error('Failed to fetch operational events');
    return response.json();
  },

  async saveOperationalEvent(event: OperationalEvent): Promise<OperationalEvent> {
    const response = await fetch(`${API_BASE}/operational-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to save operational event');
    return response.json();
  },

  // Config
  async getConfig(): Promise<{ 
    emailRecipients: string, 
    emailCc: string,
    disciplineEmails?: Record<string, string>,
    googleScriptUrl?: string
  }> {
    const response = await fetch(`${API_BASE}/config`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  },

  async saveConfig(config: { 
    emailRecipients: string, 
    emailCc: string,
    disciplineEmails?: Record<string, string>,
    googleScriptUrl?: string
  }): Promise<any> {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to save config');
    return response.json();
  },

  async sendEmail(payload: { subject: string, text: string, recipients?: string, carbonCopy?: string, attachment?: { filename: string, content: string } }): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to send email');
    }
    return response.json();
  }
};

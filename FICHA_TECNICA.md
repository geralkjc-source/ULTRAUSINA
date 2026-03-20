# Ficha Técnica - SIGO (Sistema Integrado de Gestão Operacional)

## 1. Informações Gerais
*   **Nome do Projeto:** SIGO - Sistema Integrado de Gestão Operacional
*   **Cliente:** Vulcan
*   **Versão Atual:** 4.0 (Arquitetura Full-Stack)
*   **Descrição:** Plataforma web para monitoramento em tempo real de status de produção, controle de qualidade e gestão de pendências operacionais. O sistema foca em mobilidade, funcionamento offline-first e sincronização robusta com a nuvem.

## 2. Arquitetura e Tecnologias

### Linguagem Principal
*   **Linguagem:** TypeScript (v5+)

### Frontend (Interface do Usuário)
*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Estilização:** Tailwind CSS (Design System moderno e responsivo)
*   **Animações:** Framer Motion
*   **Ícones:** Lucide React
*   **Gráficos:** Recharts (Visualização de dados e dashboards)
*   **Gerenciamento de Rotas:** React Router DOM (HashRouter para compatibilidade)

### Backend (Servidor e Integração)
*   **Runtime:** Node.js
*   **Framework:** Express
*   **Proxy de Sincronização:** Camada intermediária para comunicação com Google Apps Script e persistência secundária.
*   **Notificações:** Nodemailer (Envio de alertas e relatórios por e-mail).

### Armazenamento e Sincronização
*   **Local:** LocalStorage (Persistência de dados no navegador para operação offline).
*   **Nuvem:** Google Sheets (via Google Apps Script) servindo como banco de dados relacional e repositório de histórico.
*   **Estratégia:** Omni-Sync (Sincronização bidirecional automática e manual).

## 3. Funcionalidades Principais

### Dashboards e Monitoramento
*   **Dashboard Principal:** Visão geral da produção e qualidade em tempo real.
*   **Supervisório (Analytics):** Gráficos interativos de performance e indicadores de área.
*   **Monitor de Sincronismo:** Status em tempo real da conexão com a nuvem e itens pendentes.

### Gestão Operacional
*   **Checklists por Área:** Formulários dinâmicos para inspeção e reporte de produção.
*   **Lista de Pendências:** Gestão de itens críticos com fluxo de resolução e comentários.
*   **Histórico de Relatórios:** Acesso a registros passados com filtros avançados.
*   **Calendário de Turnos:** Visualização e planejamento de escalas operacionais.
*   **Resultados DFP:** Módulo específico para controle de qualidade e resultados técnicos.
*   **Gestão de Peças de Desgaste:** Cadastro, monitoramento de vida útil, histórico imutável de movimentações e controle de estoque.

### Utilitários e Exportação
*   **Exportação de Dados:** Geração de relatórios em PDF (jsPDF) e planilhas Excel (XLSX).
*   **Suporte Multi-idioma:** Interface disponível em Português (PT) e Inglês (EN).
*   **Inteligência Artificial:** Integração com Google Gemini para análise de dados e suporte operacional.

## 4. Requisitos de Sistema
*   **Navegador:** Google Chrome, Microsoft Edge ou Safari (versões recentes).
*   **Conectividade:** Funciona offline para coleta de dados; requer internet para sincronização com a nuvem.
*   **Dispositivos:** Otimizado para Desktops, Tablets e Smartphones (Design Responsivo).

---
*Documento gerado automaticamente em 19 de Março de 2026.*

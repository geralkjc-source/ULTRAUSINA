# Especificação Técnica e Funcional - Plataforma Vulcan Ultrafino Usina 2

Este documento detalha todas as funcionalidades, áreas de atuação e serviços disponíveis na Plataforma Vulcan.

## 1. Áreas de Atuação (Checklists e Operação)
O sistema cobre as quatro áreas principais da Usina 2:
*   **Mecânica:** Checklists focados em manutenção preventiva e corretiva de equipamentos mecânicos.
*   **Elétrica:** Monitoramento de painéis, motores e sistemas de distribuição de energia.
*   **Instrumentação:** Calibração e verificação de sensores, transmissores e sistemas de controle.
*   **Operação:** Rondas operacionais, verificação de parâmetros de processo e eventos operacionais.

## 2. Funcionalidades por Módulo (Páginas)

### Dashboard
*   **Visão Geral:** Indicadores de performance, pendências ativas e status da sincronização.
*   **Monitoramento:** Acesso rápido aos dados mais recentes de todas as áreas.

### Checklist
*   **Checklist de Área:** Formulários dinâmicos para registro de conformidade de equipamentos.
*   **Registro de Reporte:** Permite reportar falhas diretamente durante a execução do checklist.

### Pendências (PendingList)
*   **Gestão de Pendências:** Lista completa de itens abertos e resolvidos.
*   **Resolução:** Interface para baixa de pendências com registro de nome do executor e **descrição técnica** detalhada.
*   **Filtros:** Busca por TAG, descrição, área, status e turma.
*   **Compartilhamento:** Geração de resumo para WhatsApp.

### Histórico (ReportsHistory)
*   **Consulta:** Histórico completo de todos os relatórios gerados.
*   **Rastreabilidade:** Acompanhamento de quando e por quem cada item foi reportado ou resolvido.

### Sincronização (SyncDashboard)
*   **Status:** Monitoramento da sincronização entre o dispositivo local e a nuvem (Backend/Google Sheets).
*   **Forçar Sincronização:** Botão para disparar o sync manual.

### Formulários Operacionais (OperationalForms)
*   **Eventos Operacionais:** Registro de ocorrências relevantes durante o turno.
*   **Pendência Manual:** Criação de pendências sem passar pelo checklist.

### Histórico de Performance (PerformanceHistory)
*   **Análise:** Visualização de eventos operacionais passados para análise de tendência.

### DFP (DFPResults)
*   **Qualidade:** Registro e consulta de relatórios de qualidade DFP.

### Calendário de Turno (ShiftCalendar)
*   **Escala:** Visualização da escala oficial de turmas (A, B, C, D) para todo o ano de 2026.

## 3. Serviços Disponíveis (Backend & Integrações)

### Sincronização e Dados
*   **`googleSync.ts`:** Integração com Google Sheets (Apps Script) para persistência em nuvem.
*   **`backendService.ts`:** Integração com o backend Express v4.0 para persistência robusta.
*   **`employeeService.ts`:** Gestão de cadastro de funcionários para preenchimento automático.

### Exportação e Relatórios
*   **`pdfExport.ts`:**
    *   **PDF Turno:** Relatório executivo com foco no que foi resolvido no turno e pendências para o próximo.
    *   **Auditoria Master:** Relatório completo de rastreabilidade para auditoria.
*   **`excelExport.ts`:** Exportação de dados operacionais para formato Excel.

### Comunicação e Utilidades
*   **`whatsappShare.ts`:** Formatação de resumos operacionais para compartilhamento rápido via WhatsApp.
*   **`shiftService.ts`:** Motor de cálculo da escala de turno (turmas A, B, C, D) e horários operacionais.
*   **`gemini.ts`:** Integração com IA para suporte a tarefas complexas.

## 4. Especificações Técnicas
*   **Arquitetura:** Full-stack (Express + Vite + React).
*   **Persistência:** LocalStorage (offline-first) + Sincronização em Nuvem.
*   **Segurança:** Controle de acesso por turma e rastreabilidade de ações.
*   **Escalabilidade:** Estrutura modular permitindo adição de novas áreas e formulários.

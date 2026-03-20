# SIGO Usina 2 - Sistema Integrado de Gestão Operacional

Plataforma industrial full-stack projetada para a gestão operacional em tempo real, focada em rastreabilidade de ativos, controle de manutenção e monitoramento de processos.

## 🚀 Funcionalidades Principais

*   **Gestão de Ativos:** Controle completo de peças de desgaste (vida útil, estoque, histórico).
*   **Monitoramento Operacional:** Dashboards em tempo real para DFP, Bombeamento, Espesadores e Colunas.
*   **Gestão de Pendências:** Fluxo completo de reporte, resolução e compartilhamento de pendências técnicas.
*   **Checklists e Formulários:** Inspeções dinâmicas e registro de eventos operacionais.
*   **Histórico e Auditoria:** Rastreabilidade total de ações e performance.
*   **Escala de Turno:** Gestão de turmas operacionais (A, B, C, D).

## 🛠️ Stack Tecnológica

*   **Frontend:** React 18+ (TypeScript), Tailwind CSS, Framer Motion, Vite.
*   **Backend:** Node.js, Express.js.
*   **Persistência:** Google Cloud Firestore (NoSQL), LocalStorage (offline-first).
*   **Infraestrutura:** Google Cloud Run (Serverless), Firebase Auth (OAuth).

## 🛡️ Segurança e Integridade

*   **Default Deny:** Acesso restrito por padrão.
*   **Validação Server-side:** Regras de segurança robustas no Firestore validando tipos, tamanhos e integridade de dados.
*   **RBAC:** Controle de acesso baseado em funções para evitar escalação de privilégios.
*   **Auditoria:** Trilha imutável de movimentações de ativos e ações operacionais.

---
*Documentação técnica detalhada disponível em `/APP_SPECIFICATION.md` e `/FICHA_TECNICA.md`.*

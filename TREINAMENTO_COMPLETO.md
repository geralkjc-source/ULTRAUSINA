# Manual Completo de Treinamento - Plataforma SIGO Usina 2

Este documento é o guia definitivo para todos os usuários da plataforma. Ele cobre todas as funcionalidades, regras de negócio e fluxos operacionais.

---

## 1. Visão Geral da Plataforma
A **Plataforma SIGO Usina 2** é um sistema de gestão operacional desenhado para garantir a rastreabilidade, qualidade e eficiência da operação.

---

## 2. Menu Principal e Funcionalidades

### A. Dashboard
*   **Função:** Painel central de monitoramento.
*   **Regra:** Exibe alertas críticos (ex: volume de pendências DFP) e status geral.

### B. Supervisório (Analytics)
*   **Função:** Visualização de dados históricos e tendências.
*   **Regra:** Utilizado para análise de performance de longo prazo.

### C. Pendências
*   **Função:** Gestão de falhas e problemas operacionais.
*   **Regra de Ouro:** Ao resolver uma pendência, é **OBRIGATÓRIO** preencher a **Descrição Técnica**. Sem ela, o trabalho não é contabilizado nos relatórios de turno.

### D. Histórico
*   **Função:** Consulta de relatórios passados.

### E. Sincronização
*   **Função:** Monitoramento do status de envio de dados para a nuvem.
*   **Regra:** Ícone amarelo indica dados pendentes (aguardando conexão). Ícone verde indica sincronizado.

### F. Formulários Operacionais
Este módulo contém os registros críticos da operação:
1.  **Elogio:** Registro de boas práticas ou desempenho excepcional.
2.  **Falha:** Registro de ocorrências que não geram pendências automáticas, mas precisam de rastreabilidade.
3.  **Semáforo de Qualidade:** Ferramenta para avaliação rápida da qualidade do produto (Verde/Amarelo/Vermelho).
4.  **Pendência Manual:** Criação de pendências sem passar pelo checklist.

### G. Histórico de Performance
*   **Função:** Análise de eventos operacionais passados.

### H. Checklists
*   **Áreas:** DFP 2, BOMBEAMENTO, ESPESADORES E REAGENTES, HBF-COLUNAS C, HBF-COLUNAS D.
*   **Regra:** O preenchimento do checklist é a base para a criação automática de pendências.

---

## 3. Regras de Negócio e Fluxos

### 1. Escala 2026
*   O sistema possui a escala oficial de turmas (A, B, C, D) para todo o ano de 2026.
*   **Regra:** O sistema identifica automaticamente a turma logada e o turno vigente para vincular os relatórios corretamente.

### 2. Fluxo de Resolução de Pendências
1.  **Reporte:** Ocorre via Checklist ou Pendência Manual.
2.  **Ação:** O operador realiza a intervenção técnica.
3.  **Baixa:** O operador clica em "Resolver Agora".
4.  **Descrição Técnica:** O operador preenche o que foi feito.
5.  **Relatório:** O sistema automaticamente extrai essa descrição técnica para o **PDF Turno** e **Auditoria Master**.

### 3. Semáforo de Qualidade (Regras de Registro)
*   **Verde:** Operação dentro dos parâmetros de qualidade.
*   **Amarelo:** Operação com desvio leve, requer atenção.
*   **Vermelho:** Operação fora de especificação, requer ação imediata e registro de falha.

---

## 4. Relatórios e Auditoria

### PDF Turno
*   **Foco:** Trabalho realizado no turno atual + Pendências para o próximo turno.
*   **Regra:** Só inclui pendências resolvidas no intervalo de tempo do turno vigente.

### Auditoria Master
*   **Foco:** Histórico completo de rastreabilidade.
*   **Regra:** Inclui todas as resoluções e pendências de todo o período, independente do turno.

---

## 5. Dicas de Ouro para os Usuários
*   **Sincronização:** Se o app estiver offline, ele salva tudo localmente. Assim que conectar à internet, ele sincroniza sozinho.
*   **Descrição Técnica:** Quanto mais detalhada for a descrição técnica na resolução, melhor será o seu relatório de turno e mais fácil será a auditoria futura.
*   **Auditoria:** O sistema guarda tudo. Não tente "burlar" o sistema; registre a realidade da operação.

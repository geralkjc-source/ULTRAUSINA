# Manual de Treinamento Operacional - Plataforma SIGO Usina 2

Este manual detalha o passo a passo de todas as operações dentro do aplicativo.

---

## 1. Checklists: Como Preencher
Os checklists são a base da nossa rastreabilidade.

### Passo a Passo:
1.  No menu principal, clique em **Checklists**.
2.  Selecione a área desejada (**DFP 2, BOMBEAMENTO, ESPESADORES E REAGENTES, HBF-COLUNAS C ou HBF-COLUNAS D**).
3.  Percorra os itens de inspeção.
4.  Para cada item:
    *   Se estiver **OK**, marque a conformidade.
    *   Se houver **Anomalia**, reporte imediatamente.
5.  **Regra de Ouro:** Ao reportar uma falha, o sistema cria automaticamente uma pendência no painel de **Pendências**. Não é necessário criar manualmente se o checklist já gerou o reporte.

---

## 2. Pendências: Como Adicionar e Resolver

### A. Adicionar Pendência Manualmente
Utilize apenas se o problema não estiver no checklist.
1.  Vá em **Formulários Operacionais** > **Pendência Manual**.
2.  Preencha a **Área**, **Disciplina** (Mecânica, Elétrica, etc.), **Tag do Equipamento** e **Descrição**.
3.  Defina a **Prioridade** (Baixa, Média, Alta).
4.  Clique em **Salvar**.

### B. Como Resolver uma Pendência (Fluxo Obrigatório)
1.  Vá em **Pendências**.
2.  Localize a pendência na lista (filtre por "Em Aberto").
3.  Clique no botão **"Resolver Agora"**.
4.  **Preenchimento da Baixa:**
    *   **Seu Nome:** Identifique-se.
    *   **Descrição Técnica (Obrigatória):** Detalhe exatamente o que foi feito.
        *   *Exemplo:* "Substituído rolamento do motor M-105 e lubrificado mancal."
5.  Clique em **Confirmar**.
6.  *Resultado:* A pendência muda para "Resolvido" e a descrição técnica é enviada para o **PDF de Turno** e **Auditoria Master**.

---

## 3. Semáforo de Qualidade (Regras de Registro)
O Semáforo de Qualidade é a ferramenta de decisão rápida do operador.

| Cor | Status | Significado | Ação do Operador |
| :--- | :--- | :--- | :--- |
| **Verde** | Conformidade | Parâmetros dentro da especificação. | Seguir operação normal. |
| **Amarelo** | Atenção | Desvio leve, tendência de fora de especificação. | Monitorar e registrar no formulário de "Falha". |
| **Vermelho** | Crítico | Fora de especificação, risco ao processo. | Ação imediata, registrar falha e abrir pendência. |

---

## 4. Formulários Operacionais (Detalhado)

*   **Elogio:** Use para registrar boas práticas, segurança ou desempenho acima da média da equipe.
*   **Falha:** Use para registrar qualquer evento que interrompeu ou prejudicou a operação, mesmo que não gere uma pendência física (ex: queda de energia, falha de comunicação).
*   **Pendência Manual:** (Conforme detalhado no item 2.A).

---

## 5. Relatórios e Auditoria (Regras de Geração)

### PDF Turno (Relatório Executivo)
*   **O que faz:** Gera um resumo para a passagem de turno.
*   **Regra:** Filtra apenas o que foi resolvido no turno atual e o que ficou pendente.
*   **Dica:** Use a "Descrição Técnica" preenchida na resolução para que o relatório fique profissional.

### Auditoria Master
*   **O que faz:** Gera um histórico completo de tudo o que aconteceu na planta.
*   **Regra:** Não possui filtro de turno. É a fonte da verdade para auditorias de longo prazo.

---

## 6. Sincronização (Regras de Ouro)
*   **Offline-First:** O app funciona sem internet. Ele salva tudo no dispositivo.
*   **Sincronização Automática:** O sistema tenta enviar os dados a cada 30 segundos.
*   **Status:**
    *   **Verde:** Tudo sincronizado.
    *   **Amarelo:** Dados pendentes (aguardando internet).
*   **Dica:** Antes de sair da planta, verifique se o ícone está verde. Se estiver amarelo, force a sincronização na tela de **Sincronização**.

---

## 7. Escala 2026
*   O sistema reconhece automaticamente a turma (A, B, C, D) baseada na data atual.
*   **Regra:** Não altere manualmente a turma, a menos que haja uma troca de escala autorizada. O sistema vincula o relatório à turma logada.

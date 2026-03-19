# Manual do Usuário - Plataforma SIGO Usina 2

Bem-vindo à Plataforma SIGO. Este sistema foi desenvolvido para a gestão operacional da Usina 2, permitindo o acompanhamento de pendências, checklists, relatórios de turno e sincronização de dados.

## 1. Visão Geral
A plataforma centraliza as informações operacionais, garantindo que a troca de turno seja eficiente e que as pendências sejam rastreáveis.

## 2. Funcionalidades Principais

### Dashboard
*   **Visão Geral:** Acompanhe o status das pendências, relatórios de qualidade e eventos operacionais.
*   **Sincronização:** O sistema sincroniza automaticamente com a nuvem (Google Sheets/Backend) para garantir que os dados estejam sempre atualizados.

### Checklist
*   **Execução:** Realize checklists por área (Mecânica, Elétrica, Instrumentação, Operação).
*   **Registro:** Salve os relatórios de checklist que serão sincronizados automaticamente.

### Pendências (Painel de Controle)
*   **Registro:** Registre novas pendências manualmente ou via checklist.
*   **Resolução:** Marque pendências como resolvidas.
    *   *Importante:* Ao resolver, preencha a **Descrição Técnica** do que foi feito. Esta descrição aparecerá nos relatórios de turno e auditoria.
*   **Compartilhamento:** Copie um resumo das pendências (resolvidas no turno + pendentes) para compartilhar via WhatsApp com a equipe.

### Relatórios e Auditoria
*   **PDF Turno:** Gera um relatório resumido focado no trabalho realizado no turno atual e nas pendências pendentes para o próximo turno.
*   **Auditoria Master:** Gera um relatório completo de todas as resoluções e pendências para fins de histórico e auditoria.

## 3. Como Utilizar

### Como Registrar a Resolução de uma Pendência
1.  Vá até a página de **Pendências**.
2.  Clique em **"Resolver Agora"** na pendência desejada.
3.  Preencha o seu nome (ou selecione na lista) e a **Descrição Técnica** (o que foi feito para resolver).
4.  Clique em **Confirmar**.

### Como Gerar o Relatório de Turno
1.  Na página de **Pendências**, clique no botão **"PDF Turno"**.
2.  O sistema gerará automaticamente um PDF contendo:
    *   Trabalho realizado (resolvidos no turno atual).
    *   Pendências ativas (carga para o próximo turno).
3.  A descrição técnica preenchida na resolução aparecerá no relatório.

## 4. Sincronização
*   O sistema tenta sincronizar automaticamente a cada 30 segundos.
*   Se o ícone de sincronização estiver amarelo ("Pendentes"), significa que há dados locais aguardando envio.
*   O ícone verde ("Sincronizado") indica que todos os dados estão na nuvem.

## 5. Especificações Técnicas
*   **Versão:** 4.0
*   **Persistência:** Dados salvos localmente (LocalStorage) e sincronizados com Backend/Google Sheets.
*   **Formato de Relatórios:** PDF (gerado via jsPDF).
*   **Escala de Turno:** Baseada na escala oficial SIGO Usina 2 2026.

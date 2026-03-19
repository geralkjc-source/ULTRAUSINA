
import { Report, ChecklistItem, PendingItem, QualityReport, QualityCategory, Area } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { getCurrentShiftRange } from './shiftService';

/**
 * Formata um relatório de qualidade para WhatsApp.
 */
export const formatQualityReportForWhatsApp = (report: QualityReport): string => {
  const dateStr = new Date(report.timestamp).toLocaleDateString('pt-BR');
  const timeStr = new Date(report.timestamp).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  const categoryLabels: Record<QualityCategory, string> = {
    'DFP2': 'DFP2 - PLANTAS C/D',
    'DFP2_C': 'DFP2 - PLANTA C',
    'DFP2_D': 'DFP2 - PLANTA D',
    'COLUNAS_D': 'COLUNAS D',
    'HUMIDADE_PLY': 'HUMIDADE E PLY'
  };

  let message = `*RELATÓRIO DE QUALIDADE E YIELD*\n`;
  message += `📍 ÁREA: ${categoryLabels[report.category]}\n`;
  message += `📅 DATA: ${dateStr} | 🕒 HORA: ${timeStr}\n`;
  message += `🔄 TURNO: ${report.turno.toUpperCase()} | 👥 TURMA: ${report.turma} | 👷 OPERADOR: ${report.operator.toUpperCase()}\n\n`;

  if (report.category === 'DFP2_C') {
    message += `📈 YIELD: ${report.dfp2_c_yield}% \n`;
    message += `📉 REJECT ASH: ${report.dfp2_c_reject_ash}% \n`;
    message += `💎 CONC ASH: ${report.dfp2_c_conc_ash}% \n`;
    message += `⚙️ CR: ${report.dfp2_c_cr}% \n`;
    message += `🧪 COLECTOR: ${report.dfp2_c_colector} m³/h \n`;
    message += `🧪 FROTHER: ${report.dfp2_c_frother} m³/h \n`;
  } else if (report.category === 'DFP2_D') {
    message += `📈 YIELD: ${report.dfp2_d_yield}% \n`;
    message += `📉 REJECT ASH: ${report.dfp2_d_reject_ash}% \n`;
    message += `💎 CONC ASH: ${report.dfp2_d_conc_ash}% \n`;
    message += `⚙️ CR: ${report.dfp2_d_cr}% \n`;
    message += `🧪 COLECTOR: ${report.dfp2_d_colector} m³/h \n`;
    message += `🧪 FROTHER: ${report.dfp2_d_frother} m³/h \n`;
  } else if (report.category === 'COLUNAS_D') {
    message += `💎 PRODUCT ASH: ${report.colunas_d_conc_ash}% \n`;
    message += `📈 YIELD: ${report.colunas_d_yield}% \n`;
    message += `📉 TAIL ASH: ${report.colunas_d_reject_ash}% \n`;
    message += `🧪 COLECTOR: ${report.colunas_d_colector} m³/h \n`;
    message += `🧪 FROTHER: ${report.colunas_d_frother} m³/h \n`;
  } else if (report.category === 'HUMIDADE_PLY') {
    message += `🏷️ PLY: ${report.ply}\n`;
    message += `💧 HUMIDADE: ${report.humidade_fundo}% \n`;
    if (report.humidade_oversize) message += `💧 HUMIDADE OVERSIZE: ${report.humidade_oversize}% \n`;
    if (report.humidade_concentrado) message += `💧 HUMIDADE CONCENTRADO: ${report.humidade_concentrado}% \n`;
  }

  if (report.generalObservations) {
    message += `\n📝 *OBSERVAÇÕES*\n${report.generalObservations.toUpperCase()}\n`;
  }

  return message.trim();
};

/**
 * Formata um resumo de múltiplas pendências no formato solicitado.
 */
export const formatSummaryForWhatsApp = (items: PendingItem[], note?: string): string => {
  let message = `*PENDÊNCIAS E PONTOS DE ATENÇÃO NO CIRCUITO SIGO*\n\n`;
  if (note) message += `*Nota:* ${note.trim()}\n\n`;

  const groupedByArea: Record<string, PendingItem[]> = {};
  items.forEach(item => {
    if (!groupedByArea[item.area]) groupedByArea[item.area] = [];
    groupedByArea[item.area].push(item);
  });

  Object.entries(groupedByArea).forEach(([area, areaItems]) => {
    message += `*${area.toUpperCase()}*\n`;
    areaItems.forEach(item => {
      let emoji = item.status === 'resolvido' ? '✅' : (item.priority === 'alta' ? '🔴' : '🟡');
      const tagPart = item.tag ? item.tag.trim() : '';
      const descPart = item.description ? item.description.trim().toUpperCase() : '';
      message += tagPart ? `▪️${tagPart}${emoji} ${descPart}\n` : `▪️${descPart}${emoji}\n`;
    });
    message += `\n`;
  });
  return message.trim();
};

/**
 * Formata um resumo de turno com trabalhos realizados e pendências remanescentes.
 */
export const formatShiftSummaryForWhatsApp = (items: PendingItem[], shiftInfo: { turma: string, turno: string }): string => {
  const shiftRange = getCurrentShiftRange();
  
  // Filtra itens resolvidos neste turno (com base no resolvedAt)
  const resolvedItems = items.filter(i => {
    if (i.status !== 'resolvido' || !i.resolvedAt) return false;
    const inRange = i.resolvedAt >= shiftRange.start && i.resolvedAt <= shiftRange.end;
    const inTolerance = i.resolvedAt > shiftRange.end && i.resolvedAt <= shiftRange.end + 60 * 60 * 1000 && i.resolvedByTurma === shiftInfo.turma;
    return (inRange || inTolerance);
  });
  
  const openItems = items.filter(i => i.status === 'aberto');
  const dateStr = new Date().toLocaleDateString('pt-BR');

  let message = `*RESUMO OPERACIONAL - SIGO USINA 2*\n`;
  message += `📅 DATA: ${dateStr} | 👥 TURMA: ${shiftInfo.turma} | 🕒 TURNO: ${shiftInfo.turno}\n\n`;

  message += `✅ *TRABALHO REALIZADO NO TURNO*\n`;
  if (resolvedItems.length === 0) {
    message += `_Nenhum item resolvido neste turno._\n`;
  } else {
    const groupedResolved: Record<string, PendingItem[]> = {};
    resolvedItems.forEach(item => {
      if (!groupedResolved[item.area]) groupedResolved[item.area] = [];
      groupedResolved[item.area].push(item);
    });

    Object.entries(groupedResolved).forEach(([area, areaItems]) => {
      message += `\n*${area.toUpperCase()}*\n`;
      areaItems.forEach(item => {
        const tagPart = item.tag ? `▪️${item.tag.trim()} ` : `▪️`;
        message += `${tagPart}${item.description.trim().toUpperCase()} ✅\n`;
      });
    });
  }

  message += `\n\n🚨 *PENDÊNCIAS REMANESCENTES*\n`;
  if (openItems.length === 0) {
    message += `_Nenhuma pendência em aberto._\n`;
  } else {
    const groupedOpen: Record<string, PendingItem[]> = {};
    openItems.forEach(item => {
      if (!groupedOpen[item.area]) groupedOpen[item.area] = [];
      groupedOpen[item.area].push(item);
    });

    Object.entries(groupedOpen).forEach(([area, areaItems]) => {
      message += `\n*${area.toUpperCase()}*\n`;
      areaItems.forEach(item => {
        let emoji = item.priority === 'alta' ? '🔴' : '🟡';
        const tagPart = item.tag ? `▪️${item.tag.trim()} ` : `▪️`;
        message += `${tagPart}${item.description.trim().toUpperCase()} ${emoji}\n`;
      });
    });
  }

  return message.trim();
};

/**
 * Formata um relatório completo respeitando as visibilidades condicionais.
 */
export const formatReportForWhatsApp = (report: Report, itemsWithMaybeSections?: ChecklistItem[]): string => {
  const dateStr = new Date(report.timestamp).toLocaleDateString('pt-BR');
  const timeStr = new Date(report.timestamp).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const turnoAjustado = report.turno.toUpperCase();

  let message = `*${report.area.toUpperCase()}*\n`;
  message += `📅 DATA: ${dateStr} | 🕒 HORA: ${timeStr}\n`;
  message += `🔄 TURNO: ${turnoAjustado} | 👥 TURMA: ${report.turma} | 👷 OPERADOR: ${report.operator.toUpperCase()}\n\n`;

  let itemsToFormat: ChecklistItem[] = [];

  if (itemsWithMaybeSections && itemsWithMaybeSections.some(i => i.label.startsWith('SECTION:'))) {
    itemsToFormat = itemsWithMaybeSections;
  } else {
    const template = CHECKLIST_TEMPLATES[report.area] || [];
    let itemPointer = 0;
    template.forEach((templateLabel, idx) => {
      if (templateLabel.startsWith('SECTION:')) {
        itemsToFormat.push({ id: `sec-${idx}`, label: templateLabel, status: 'ok' });
      } else {
        if (report.items[itemPointer]) {
          itemsToFormat.push(report.items[itemPointer]);
          itemPointer++;
        }
      }
    });
  }

  let hideDueToNoFeed = false;
  let activeSubcellHide = false;
  let hideM1 = false;
  let hideM2 = false;
  let hideM3 = false;
  let hideM4 = false;

  const linesItem = report.items.find(i => i.label === 'Linhas em alimentação (1-4)');
  const selectedLines = linesItem?.observation?.split(',').filter(Boolean) || [];

  itemsToFormat.forEach((item, index) => {
    if (item.label.startsWith('SECTION:')) {
      const sectionName = item.label.replace('SECTION:', '').trim();
      const sectionLower = sectionName.toLowerCase();
      
      if (hideDueToNoFeed && sectionLower.includes('equipamentos hbf')) hideDueToNoFeed = false;
      
      if (sectionName.includes('SUBCÉLULA M1')) { hideM1 = !selectedLines.includes('M1'); activeSubcellHide = hideM1; }
      if (sectionName.includes('SUBCÉLULA M2')) { hideM2 = !selectedLines.includes('M2'); activeSubcellHide = hideM2; }
      if (sectionName.includes('SUBCÉLULA M3')) { hideM3 = !selectedLines.includes('M3'); activeSubcellHide = hideM3; }
      if (sectionName.includes('SUBCÉLULA M4')) { hideM4 = !selectedLines.includes('M4'); activeSubcellHide = hideM4; }
      
      if (sectionName.includes('NÍVEIS DO TANK DE REAGENTE')) {
        hideM1 = hideM2 = hideM3 = hideM4 = false;
        activeSubcellHide = false;
      }

      const noLinesSelected = report.area === Area.DFP2 && selectedLines.length === 0;
      const isReagentSection = sectionLower === 'colector' || sectionLower === 'frother';

      if ((hideDueToNoFeed || noLinesSelected) && isReagentSection) return;

      if (activeSubcellHide) {
        const isInternalSection = sectionName === 'COLECTOR' || sectionName === 'FROTHER' || sectionName.includes('SUBCÉLULA');
        if (isInternalSection) return;
      }

      const isHiddenColumnSection = hideDueToNoFeed && sectionLower.includes('flotation columns');
      
      if (!isHiddenColumnSection) {
        message += `\n*${sectionName}*\n`;
      }
    } else {
      if (activeSubcellHide) return;

      const labelLower = item.label.toLowerCase();
      
      if (item.label === 'ALIMENTANDO COLUNAS?') {
        const isFeeding = item.status === 'ok';
        const feedStatus = isFeeding ? '🟢 SIM' : '🔴 NÃO';
        const obs = item.observation ? `\n   └ 📝 _MOTIVO: ${item.observation.toUpperCase()}_` : '';
        message += `${item.label} ${feedStatus}${obs}\n`;
        hideDueToNoFeed = !isFeeding;
        return;
      }

      const noLinesSelected = report.area === Area.DFP2 && selectedLines.length === 0;
      const isReagentItem = labelLower.includes('vazão') || labelLower.includes('sp (l/min)') || labelLower.includes('sp(l/min)');
      if ((hideDueToNoFeed || noLinesSelected) && isReagentItem) return;

      if (hideDueToNoFeed) {
        const isActuallyColumnItem = labelLower.includes('coluna') || 
                                     labelLower.includes('-fc-') || 
                                     labelLower.includes('frother') || 
                                     labelLower.includes('colector') ||
                                     labelLower.includes('feed rate colunas') ||
                                     labelLower.includes('ar (kpa)') || 
                                     labelLower.includes('nível (%)') || 
                                     labelLower.includes('setpoint (%)') ||
                                     labelLower.includes('vazão') ||
                                     labelLower.includes('sp (l/min)') ||
                                     labelLower.includes('sp(l/min)');
        if (isActuallyColumnItem) return;
      }

      const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(kpa)') || labelLower.includes('(%)') || 
                            labelLower.includes('(g/t)') || labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || 
                            labelLower.includes('(l/min)') || labelLower.includes('(tph)') || labelLower.includes('(hz)') ||
                            labelLower.includes('(mm)');
      const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

      if (isMeasurement || isTextInput) {
        let suffix = "";
        
        // Lógica de Diferença: 3% para Nível vs Setpoint e 10% para Reagentes (Vazão vs SP)
        const isSetpoint = labelLower.includes('setpoint (%)') || labelLower.includes('set point') || labelLower.includes('actual (%)') || labelLower.includes('atual') || labelLower.includes('sp (l/min)') || labelLower.includes('sp(l/min)');
        const isNivelOrVazao = labelLower.includes('nível (%)') || labelLower.includes('vazão');
        const isReagent = labelLower.includes('vazão') || labelLower.includes('sp (l/min)') || labelLower.includes('sp(l/min)');

        if (isNivelOrVazao || labelLower.includes('set point')) {
          const nextItem = itemsToFormat[index + 1];
          const nextLabelLower = nextItem?.label.toLowerCase() || "";
          const isNextTarget = nextLabelLower.includes('setpoint (%)') || nextLabelLower.includes('actual (%)') || nextLabelLower.includes('atual') || nextLabelLower.includes('sp (l/min)') || nextLabelLower.includes('sp(l/min)');
          
          if (nextItem && isNextTarget) {
            const val1 = parseFloat(item.observation || "0");
            const val2 = parseFloat(nextItem.observation || "0");
            if (item.observation && nextItem.observation) {
               const diff = Math.abs(val1 - val2);
               // Se for reagente, tolerância de 10% do SP. Se for nível, tolerância de 3 unidades.
               const tolerance = isReagent ? (val2 * 0.1) : 3;
               suffix = diff <= tolerance ? " 🟢" : " 🔴";
            }
          }
        } else if (isSetpoint) {
           const prevItem = itemsToFormat[index - 1];
           const prevLabelLower = prevItem?.label.toLowerCase() || "";
           const isPrevSource = prevLabelLower.includes('nível (%)') || prevLabelLower.includes('set point') || prevLabelLower.includes('vazão');

           if (prevItem && isPrevSource) {
              const valTarget = parseFloat(item.observation || "0");
              const valSource = parseFloat(prevItem.observation || "0");
              if (item.observation && prevItem.observation) {
                const diff = Math.abs(valSource - valTarget);
                const tolerance = isReagent ? (valTarget * 0.1) : 3;
                suffix = diff <= tolerance ? " 🟢" : " 🔴";
              }
           }
        }

        message += `${item.label}: ${item.observation || '---'}${suffix}\n`;
      } else {
        let statusEmoji = '';
        const obsLower = (item.observation || '').toLowerCase();

        // Mapeamento v9.0 de Emojis
        if (item.label === 'Retorno do tanque 104') {
          if (obsLower === 'com retorno') statusEmoji = '🔴';
          else if (obsLower === 'sem retorno') statusEmoji = '🟢';
          else statusEmoji = item.status === 'ok' ? '🟢' : '🔴';
        } else if (obsLower === 'ok' || obsLower === 'no lugar' || obsLower === 'sim' || obsLower === 'com retorno' || obsLower === 'limpa') {
          statusEmoji = '🟢';
        } else if (obsLower === 'anormal' || obsLower === 'fora do lugar' || obsLower === 'não' || obsLower === 'sem retorno' || obsLower === 'suja') {
          statusEmoji = '🔴';
        } else if (obsLower === 'turva') {
          statusEmoji = '🟡';
        } else if (obsLower === 'aberta' || obsLower === 'aberto') {
          statusEmoji = (labelLower.includes('diluicao')) ? '🔴' : (labelLower.includes('corse') ? '🟢' : '🔵');
        } else if (obsLower === 'fechada' || obsLower === 'fechado') {
          statusEmoji = (labelLower.includes('diluicao')) ? '🟢' : (labelLower.includes('corse') ? '🔴' : '⚪');
        } else {
          switch (item.status) {
            case 'ok': statusEmoji = '🟢'; break;
            case 'fail': statusEmoji = '🔴'; break;
            case 'na': statusEmoji = '🟡'; break;
            case 'warning': statusEmoji = '⚠️'; break;
            default: statusEmoji = '⚪'; break;
          }
        }

        let obsText = '';
        if (item.observation) {
          const cleanObs = item.observation.trim();
          const autoTexts = [
            'OK', 'RODANDO', 'SIM', 'STANDBY', 'NÃO', 'ABERTO', 'ABERTA', 'FECHADO', 'FECHADA', 
            'SEM RETORNO', 'COM RETORNO', 'BOM', 'TURVA', 'RUIM', 'NO LUGAR', 'FORA DO LUGAR', 
            'ANORMAL', 'LIMPA', 'SUJA'
          ];
          if (!autoTexts.includes(cleanObs.toUpperCase())) {
            obsText = `\n   └ 📝 _MOTIVO: ${cleanObs.toUpperCase()}_`;
          } else {
             obsText = ` ${cleanObs.toUpperCase()}`;
          }
        }
        message += `${item.label} ${statusEmoji}${obsText}\n`;
      }
    }
  });

  if (report.generalObservations) {
    message += `\n📝 *OBSERVAÇÕES/PASSAGEM*\n${report.generalObservations.toUpperCase()}\n`;
  }
  return message;
};

export const shareToWhatsApp = (text: string) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (err) {
    console.error("Copy failed", err);
    return false;
  }
};

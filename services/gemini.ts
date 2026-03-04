
import { GoogleGenAI } from "@google/genai";
import { PendingItem } from "../types";

export const analyzePendingItems = async (items: PendingItem[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key não configurada. Por favor, contate o administrador.";
  }

  // Initializing GenAI client using the correct pattern
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const context = items.map(i => `- Área: ${i.area}, Descrição: ${i.description}, Prioridade: ${i.priority}`).join('\n');

  try {
    // Upgraded to gemini-3-pro-preview for complex technical analysis as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Você é um Engenheiro de Manutenção e Especialista em Operações Industriais da planta Ultrafino Usina 2. 
      Analise as seguintes pendências reportadas e forneça um resumo executivo com:
      1. Principais gargalos detectados por área.
      2. Recomendações de priorização técnica.
      3. Possíveis causas raiz para falhas recorrentes baseadas nas descrições.
      
      Seja conciso, profissional e técnico. Use português do Brasil.
      
      PENDÊNCIAS:
      ${context}`,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });

    // Accessing .text property directly as per modern GenAI SDK
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao processar análise inteligente. Verifique sua conexão ou cota da API.";
  }
};

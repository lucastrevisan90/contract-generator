import { createClient } from "@google/genai";

const client = createClient({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export async function extractContractData(prompt: string, placeholders: string[]) {
  const systemPrompt = `
    Você é um assistente jurídico especializado em extração de dados.
    Receba uma solicitação em linguagem natural e uma lista de variáveis.
    Sua tarefa é extrair os valores para estas variáveis a partir do texto.
    
    Variáveis para extrair: ${placeholders.join(", ")}
    
    Retorne APENAS um objeto JSON onde as chaves são as variáveis e os valores são o que foi extraído.
    Se não encontrar o valor para uma variável, retorne null para ela.
    
    Exemplo:
    Prompt: "Contrata o Lucas Silva, CPF 123, por 5000 reais"
    Variáveis: ["contratado", "cpf", "valor"]
    Resposta: {"contratado": "Lucas Silva", "cpf": "123", "valor": "R$ 5.000,00"}
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-1.5-flash", 
      contents: [systemPrompt, prompt],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");

    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Error:", error);
    throw new Error(`Erro na IA: ${error.message || "Falha na comunicação"}`);
  }
}

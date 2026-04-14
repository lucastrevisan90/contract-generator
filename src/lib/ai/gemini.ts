import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function extractContractData(prompt: string, placeholders: string[]) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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

  const result = await model.generateContent([systemPrompt, prompt]);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Basic cleaning in case the AI adds markdown blocks
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Falha ao interpretar a resposta da IA");
  }
}

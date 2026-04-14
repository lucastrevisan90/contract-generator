/**
 * Solução Definitiva: Utilizando a API REST nativa do Google Gemini via fetch.
 * Isso elimina problemas de versão de SDK, erros de importação (como o createClient faltando)
 * e incompatibilidades com o Turbopack/Vercel.
 */
export async function extractContractData(prompt: string, placeholders: string[]) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("A chave GOOGLE_GENERATIVE_AI_API_KEY não foi configurada nas variáveis de ambiente.");
  }

  // Utilizamos a versão estável 'v1' e o modelo estável 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `
    Você é um assistente jurídico especializado em extração de dados de contratos.
    Receba uma solicitação em linguagem natural e uma lista de variáveis.
    Sua tarefa é extrair os valores para estas variáveis a partir do texto.
    
    Variáveis para extrair: ${placeholders.join(", ")}
    
    Retorne APENAS um objeto JSON puro, sem formatação markdown, onde as chaves são as variáveis e os valores são o que foi extraído.
    Se não encontrar o valor para uma variável, retorne null para ela.
    
    Exemplo de saída esperada:
    {"contratado": "João Silva", "cpf": "123", "valor": "5000"}
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("AI REST Error Response:", errorData);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorData.error?.message || "Erro desconhecido"}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("A IA não retornou um conteúdo válido.");
    }

    // Parseando o JSON extraído
    return JSON.parse(resultText);
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw new Error(`Falha no Processamento IA: ${error.message}`);
  }
}

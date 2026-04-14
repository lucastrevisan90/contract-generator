/**
 * Solução Definitiva e Universal (v2026): 
 * Utilizamos o modelo 'gemini-2.5-flash-lite', que é o cavalo de batalha do PLANO GRATUITO.
 * Ele possui cotas generosas e suporta perfeitamente a extração de JSON.
 */
export async function extractContractData(prompt: string, placeholders: string[]) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("A chave GOOGLE_GENERATIVE_AI_API_KEY não foi configurada nas variáveis de ambiente.");
  }

  // Utilizamos v1beta para garantir acesso aos modelos Flash-Lite mais recentes do plano gratuito.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

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
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("AI REST Error Response:", errorData);
      throw new Error(`Erro na API Gemini (${response.status}): ${errorData.error?.message || "Erro de cota ou conexão"}`);
    }

    const data = await response.json();
    let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("A IA não retornou um conteúdo válido.");
    }

    // Limpeza robusta para extrair JSON
    try {
      const cleaned = resultText.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Erro ao parsear JSON da IA:", resultText);
      throw new Error("A IA retornou um formato de dados inválido.");
    }
  } catch (error: any) {
    console.error("AI Service Error:", error);
    throw new Error(`Falha no Processamento IA: ${error.message}`);
  }
}

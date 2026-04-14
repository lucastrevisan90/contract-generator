"use server";

import { createClient } from "@/lib/supabase/server";
import { extractContractData } from "@/lib/ai/gemini";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export async function generateContractAction(templateId: string, prompt: string) {
  try {
    const supabase = await createClient();

    // 0. Get User ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // 1. Get Template info
    const { data: template, error: tError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id) // Ensure security
      .single();

    if (tError || !template) throw new Error("Template não encontrado");

    // 2. Extract data via AI
    const extractedData = await extractContractData(prompt, template.placeholders);

    // 3. Get Contractor Fixed Data (from settings)
    const { data: settings } = await supabase
      .from("contractor_settings")
      .select("*")
      .single();

    // 4. Download template from Storage
    const { data: fileData, error: fError } = await supabase.storage
      .from("templates")
      .download(template.file_path);

    if (fError) throw new Error("Erro ao baixar o template do storage");

    // 5. Generate DOCX
    const arrayBuffer = await fileData.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" }
    });

    const mergeData = {
      ...extractedData,
      contratante_nome: settings?.name || "NOME DO CONTRATANTE",
      contratante_doc: settings?.document || "000.000.000-00",
      contratante_endereco: settings?.address || "ENDERECO COMPLETO",
      contratante_tel: settings?.phone || "TELEFONE",
    };

    doc.setData(mergeData);
    doc.render();

    const buffer = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    // 6. Upload generated contract to Storage
    const outFileName = `generated/${Date.now()}_contrato.docx`;
    const { data: uploadData, error: uError } = await supabase.storage
      .from("contracts")
      .upload(outFileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

    if (uError) throw uError;

    // 7. Save to History
    const { data: contract, error: hError } = await supabase.from("contracts").insert({
      template_id: templateId,
      user_id: user.id, // Fixed: passing user_id
      contractor_name: extractedData.contratado || "N/A",
      contract_value: extractedData.valor || "N/A",
      file_path: uploadData.path,
      metadata: mergeData
    }).select().single();

    if (hError) throw hError;

    return { 
      success: true, 
      downloadUrl: supabase.storage.from("contracts").getPublicUrl(uploadData.path).data.publicUrl,
      contractId: contract.id
    };
  } catch (error: any) {
    console.error("Generation Error:", error);
    return { success: false, error: error.message };
  }
}

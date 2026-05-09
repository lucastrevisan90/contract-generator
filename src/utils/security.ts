/**
 * Utilitários de Segurança e Validação
 */

/**
 * Sanitização básica para evitar injeção de scripts e tags maliciosas.
 * Remove tags HTML e limita caracteres especiais.
 */
export function sanitizeText(text: string, maxLength: number = 255): string {
    if (!text) return '';

    // Remove tags HTML
    const clean = text.replace(/<[^>]*>/g, '');

    // Limita tamanho
    return clean.slice(0, maxLength).trim();
}

/**
 * Validação de campos obrigatórios
 */
export function validateRequired(text: string, fieldName: string): string | null {
    if (!text || !text.trim()) {
        return `O campo ${fieldName} é obrigatório.`;
    }
    return null;
}

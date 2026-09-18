import { ALL_SPAM_WORDS, URL_SHORTENERS, PROMOTIONAL_WORDS } from './spamWords';

export interface ValidationResult {
  valid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  key: string;
}

// ---- Emoji utilities ----
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

export function countEmojis(text: string): number {
  return (text.match(EMOJI_REGEX) || []).length;
}

export function containsEmoji(text: string): boolean {
  return EMOJI_REGEX.test(text);
}

// ---- Variable utilities ----
const POSITIONAL_VAR_REGEX = /\{\{(\d+)\}\}/g;
const NAMED_VAR_REGEX = /\{\{([a-z][a-z0-9_]*)\}\}/g;

export function extractPositionalVars(text: string): number[] {
  const matches = [...text.matchAll(POSITIONAL_VAR_REGEX)];
  return matches.map(m => parseInt(m[1]));
}

export function extractNamedVars(text: string): string[] {
  const matches = [...text.matchAll(NAMED_VAR_REGEX)];
  return matches.map(m => m[1]);
}

export function extractAllVars(text: string, format: 'POSITIONAL' | 'NAMED'): string[] {
  if (format === 'NAMED') return extractNamedVars(text);
  return extractPositionalVars(text).map(String);
}

// ---- Validation rules ----

export function validateTemplateName(name: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!name) {
    results.push({ valid: false, message: 'Nome do template é obrigatório', severity: 'error', key: 'name_required' });
    return results;
  }
  if (name.length > 512) {
    results.push({ valid: false, message: 'Nome deve ter no máximo 512 caracteres', severity: 'error', key: 'name_length' });
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    results.push({ valid: false, message: 'Nome deve conter apenas letras minúsculas, números e underscores', severity: 'error', key: 'name_format' });
  }
  const genericPatterns = /^(test|msg|template|teste|modelo)[\d_]*$/;
  if (genericPatterns.test(name)) {
    results.push({ valid: false, message: 'Use nomes descritivos (ex: confirmacao_pedido_v2) ao invés de nomes genéricos', severity: 'warning', key: 'name_generic' });
  }
  return results;
}

export function validateBody(text: string, category: string, parameterFormat: 'POSITIONAL' | 'NAMED'): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!text || text.trim().length === 0) {
    results.push({ valid: false, message: 'O corpo da mensagem é obrigatório', severity: 'error', key: 'body_required' });
    return results;
  }

  const maxChars = (category === 'MARKETING' || category === 'UTILITY') ? 550 : 1024;
  if (text.length > maxChars) {
    results.push({ valid: false, message: `Corpo excede o limite de ${maxChars} caracteres (${text.length}/${maxChars})`, severity: 'error', key: 'body_length' });
  }

  if (text.trim().length < 20) {
    results.push({ valid: false, message: 'Corpo muito curto (mínimo 20 caracteres)', severity: 'warning', key: 'body_short' });
  }

  const emojiCount = countEmojis(text);
  if (emojiCount > 10) {
    results.push({ valid: false, message: `Máximo de 10 emojis permitidos (${emojiCount}/10)`, severity: 'error', key: 'body_emoji_limit' });
  }

  const vars = extractAllVars(text, parameterFormat);
  if (parameterFormat === 'POSITIONAL') {
    const nums = vars.map(Number).sort((a, b) => a - b);
    const expected = nums.map((_, i) => i + 1);
    const isSequential = nums.every((n, i) => n === expected[i]);
    if (!isSequential && nums.length > 0) {
      const found = nums.map(n => `{{${n}}}`).join(', ');
      const expectedStr = expected.map(n => `{{${n}}}`).join(', ');
      results.push({ valid: false, message: `Variáveis devem ser sequenciais. Encontrado: ${found}. Esperado: ${expectedStr}`, severity: 'error', key: 'body_vars_sequential' });
    }
  }

  const trimmed = text.trim();
  const varPattern = parameterFormat === 'NAMED' ? /^\{\{[a-z][a-z0-9_]*\}\}/ : /^\{\{\d+\}\}/;
  const varPatternEnd = parameterFormat === 'NAMED' ? /\{\{[a-z][a-z0-9_]*\}\}$/ : /\{\{\d+\}\}$/;
  if (varPattern.test(trimmed)) {
    results.push({ valid: false, message: 'Não inicie o corpo com uma variável', severity: 'warning', key: 'body_var_start' });
  }
  if (varPatternEnd.test(trimmed)) {
    results.push({ valid: false, message: 'Não termine o corpo com uma variável', severity: 'warning', key: 'body_var_end' });
  }

  const adjacentPattern = /\{\{[^}]+\}\}\s*\{\{[^}]+\}\}/;
  if (adjacentPattern.test(text)) {
    results.push({ valid: false, message: 'Separe variáveis adjacentes com pelo menos uma palavra', severity: 'warning', key: 'body_vars_adjacent' });
  }

  if (parameterFormat === 'NAMED') {
    const allVarMatches = [...text.matchAll(/\{\{([^}]+)\}\}/g)];
    for (const m of allVarMatches) {
      if (!/^[a-z][a-z0-9_]*$/.test(m[1])) {
        results.push({ valid: false, message: `Variável "{{${m[1]}}}" contém caracteres inválidos (use apenas letras, números e _)`, severity: 'error', key: 'body_var_special_chars' });
        break;
      }
    }
  }

  if (vars.length > 0) {
    const wordCount = text.replace(/\{\{[^}]+\}\}/g, '').trim().split(/\s+/).filter(Boolean).length;
    const minWords = 3 * vars.length + 1;
    if (wordCount < minWords) {
      results.push({ valid: false, message: `Pouco texto fixo para ${vars.length} variável(is). Mínimo: ${minWords} palavras fixas, atual: ${wordCount}`, severity: 'warning', key: 'body_var_ratio' });
    }
  }

  if (/\n{5,}/.test(text)) {
    results.push({ valid: false, message: 'Máximo 4 quebras de linha consecutivas', severity: 'warning', key: 'body_linebreaks' });
  }

  const lower = text.toLowerCase();
  const foundSpam = ALL_SPAM_WORDS.filter(w => lower.includes(w.toLowerCase()));
  if (foundSpam.length > 0) {
    results.push({ valid: false, message: `Palavras potencialmente spam detectadas: ${foundSpam.slice(0, 3).join(', ')}`, severity: 'warning', key: 'body_spam' });
  }

  for (const shortener of URL_SHORTENERS) {
    if (lower.includes(shortener)) {
      results.push({ valid: false, message: 'URLs encurtadas não são permitidas (bit.ly, tinyurl, etc.)', severity: 'error', key: 'body_shortener' });
      break;
    }
  }

  if (/\b(número do cartão|cpf|cnpj|conta bancária|número da conta|card number|social security)\b/i.test(text)) {
    results.push({ valid: false, message: 'Não solicite dados sensíveis (cartão, CPF, conta bancária)', severity: 'error', key: 'body_sensitive' });
  }

  return results;
}

export function validateHeader(header: { enabled: boolean; type: string; text?: string }): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!header.enabled) return results;
  if (header.type === 'TEXT') {
    if (!header.text || header.text.trim().length === 0) {
      results.push({ valid: false, message: 'Texto do header é obrigatório', severity: 'error', key: 'header_text_required' });
    }
    if (header.text && header.text.length > 60) {
      results.push({ valid: false, message: 'Header de texto: máximo 60 caracteres', severity: 'error', key: 'header_text_length' });
    }
    if (header.text && containsEmoji(header.text)) {
      results.push({ valid: false, message: 'Headers de texto não podem conter emojis', severity: 'error', key: 'header_emoji' });
    }
    if (header.text && /[*_~`]/.test(header.text)) {
      results.push({ valid: false, message: 'Headers não suportam formatação (*bold*, _italic_)', severity: 'warning', key: 'header_formatting' });
    }
    const vars = extractPositionalVars(header.text || '');
    if (vars.length > 1) {
      results.push({ valid: false, message: 'Header de texto suporta no máximo 1 variável', severity: 'error', key: 'header_var_limit' });
    }
  }
  return results;
}

export function validateFooter(footer: { enabled: boolean; text?: string }): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!footer.enabled) return results;
  if (footer.text && footer.text.length > 60) {
    results.push({ valid: false, message: 'Footer: máximo 60 caracteres', severity: 'error', key: 'footer_length' });
  }
  if (footer.text && containsEmoji(footer.text)) {
    results.push({ valid: false, message: 'Footer não pode conter emojis', severity: 'error', key: 'footer_emoji' });
  }
  if (footer.text && /\{\{/.test(footer.text)) {
    results.push({ valid: false, message: 'Footer não suporta variáveis', severity: 'error', key: 'footer_vars' });
  }
  return results;
}

export interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone?: string;
  flowId?: string;
  couponCode?: string;
}

export function validateButtons(buttons: TemplateButton[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const urlCount = buttons.filter(b => b.type === 'URL').length;
  const maxButtons = urlCount >= 2 ? 2 : 3;
  if (buttons.length > maxButtons) {
    results.push({ valid: false, message: urlCount >= 2 ? 'Com 2 botões URL, o máximo total é 2 botões' : 'Máximo de 3 botões por template', severity: 'error', key: 'buttons_max' });
  }
  if (urlCount > 2) results.push({ valid: false, message: 'Máximo 2 botões URL', severity: 'error', key: 'buttons_url_max' });

  const phoneCount = buttons.filter(b => b.type === 'PHONE_NUMBER').length;
  if (phoneCount > 1) results.push({ valid: false, message: 'Máximo 1 botão Telefone', severity: 'error', key: 'buttons_phone_max' });

  const catalogCount = buttons.filter(b => b.type === 'CATALOG').length;
  if (catalogCount > 1) results.push({ valid: false, message: 'Máximo 1 botão Catálogo', severity: 'error', key: 'buttons_catalog_max' });

  const mpmCount = buttons.filter(b => b.type === 'MPM').length;
  if (mpmCount > 1) results.push({ valid: false, message: 'Máximo 1 botão MPM', severity: 'error', key: 'buttons_mpm_max' });

  for (const btn of buttons) {
    if (btn.text && btn.text.length > 25) {
      results.push({ valid: false, message: `Botão "${btn.text.slice(0, 15)}..." excede 25 caracteres`, severity: 'error', key: `btn_text_${btn.text}` });
    }
    if (btn.type === 'URL' && btn.url) {
      if (!/^https:\/\//i.test(btn.url.trim())) {
        results.push({ valid: false, message: `URL do botão "${btn.text}" deve usar https://`, severity: 'warning', key: `btn_url_protocol_${btn.text}` });
      }
      for (const shortener of URL_SHORTENERS) {
        if (btn.url.includes(shortener)) {
          results.push({ valid: false, message: 'URLs encurtadas não são permitidas em botões', severity: 'error', key: 'btn_url_shortener' });
          break;
        }
      }
      if (/wa\.me/i.test(btn.url)) {
        results.push({ valid: false, message: 'Links wa.me não são permitidos em botões CTA', severity: 'error', key: 'btn_wame' });
      }
    }
  }
  return results;
}

export function detectCategoryMismatch(category: string, bodyText: string): ValidationResult | null {
  const lower = bodyText.toLowerCase();
  if (category === 'UTILITY') {
    const promoFound = PROMOTIONAL_WORDS.filter(w => lower.includes(w));
    if (promoFound.length >= 2) {
      return { valid: false, message: 'Conteúdo parece promocional. Se classificado como Utility, a Meta irá reclassificar para Marketing com possíveis penalidades.', severity: 'warning', key: 'category_mismatch_promo' };
    }
  }
  if (category === 'MARKETING') {
    const transactionalWords = ['pedido', 'order', 'entrega', 'delivery', 'rastreio', 'tracking', 'fatura', 'invoice', 'pagamento confirmado'];
    const transFound = transactionalWords.filter(w => lower.includes(w));
    if (transFound.length >= 2) {
      return { valid: false, message: 'Conteúdo parece transacional. Se classificado como Utility, pode ser gratuito na janela de 24h.', severity: 'info', key: 'category_mismatch_trans' };
    }
  }
  return null;
}

// ---- Samples validation ----

export function validateSamples(
  bodyText: string,
  headerText: string | undefined,
  samples: Record<string, string>,
  parameterFormat: 'POSITIONAL' | 'NAMED'
): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (parameterFormat !== 'POSITIONAL') return results;

  const bodyVars = extractPositionalVars(bodyText || '');
  for (const n of bodyVars) {
    if (!samples[`body_${n}`]?.trim()) {
      results.push({ valid: false, message: `Exemplo obrigatório para variável {{${n}}} do corpo`, severity: 'error', key: `sample_body_${n}` });
    }
  }

  const headerVars = extractPositionalVars(headerText || '');
  for (const n of headerVars) {
    if (!samples[`header_${n}`]?.trim()) {
      results.push({ valid: false, message: `Exemplo obrigatório para variável {{${n}}} do header`, severity: 'error', key: `sample_header_${n}` });
    }
  }

  return results;
}

// ---- Score calculation ----
interface ScoreInput {
  bodyLength: number;
  maxBodyLength: number;
  emojiCount: number;
  hasVarIssues: boolean;
  hasAdjacentVars: boolean;
  hasHeaderEmoji: boolean;
  hasWameLink: boolean;
  isGenericName: boolean;
  hasSensitiveData: boolean;
  categoryMatchOk: boolean;
  hasSpam: boolean;
  hasBrandName: boolean;
  hasOptOut: boolean;
  footerValid: boolean;
  buttonsValid: boolean;
  varRatioOk: boolean;
}

export function calculateApprovalScore(input: ScoreInput): number {
  let score = 100;
  if (input.bodyLength > input.maxBodyLength) score -= 20;
  if (input.emojiCount > 10) score -= 10;
  if (input.hasVarIssues) score -= 10;
  if (input.hasAdjacentVars) score -= 5;
  if (input.hasHeaderEmoji) score -= 5;
  if (input.hasWameLink) score -= 5;
  if (input.isGenericName) score -= 5;
  if (input.hasSensitiveData) score -= 15;
  if (!input.categoryMatchOk) score -= 10;
  if (input.hasSpam) score -= 10;
  if (!input.hasBrandName) score -= 5;
  if (!input.hasOptOut) score -= 5;
  if (!input.footerValid) score -= 5;
  if (!input.buttonsValid) score -= 5;
  if (!input.varRatioOk) score -= 10;
  return Math.max(0, Math.min(100, score));
}

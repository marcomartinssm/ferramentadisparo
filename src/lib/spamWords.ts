// Spam words that may cause Meta template rejection
export const SPAM_WORDS_PT = [
  'grátis', 'gratuito', 'free', 'ganhe', 'prêmio', 'sorteio',
  'clique aqui', 'click here', 'urgente', 'urgent', 'último dia',
  'última chance', 'imperdível', 'sensacional', 'incrível oferta',
  'não perca', 'aproveite agora', 'tempo limitado', 'aja agora',
  'act now', 'limited time', 'congratulations', 'parabéns',
  'você foi selecionado', 'you have been selected', 'winner',
  'vencedor', 'ganhador', 'renda extra', 'dinheiro fácil',
  'sem investimento', 'lucro garantido', 'oportunidade única',
  'trabalhe de casa', 'compre agora', 'buy now', 'oferta exclusiva',
  'desconto especial', 'só hoje', 'promoção relâmpago',
];

export const SPAM_WORDS_EN = [
  'free', 'winner', 'congratulations', 'click here', 'act now',
  'limited time', 'urgent', 'exclusive deal', 'buy now',
  'special discount', 'no investment', 'guaranteed profit',
  'selected', 'prize', 'earn money', 'work from home',
  'last chance', 'don\'t miss', 'incredible offer',
];

export const ALL_SPAM_WORDS = [...new Set([...SPAM_WORDS_PT, ...SPAM_WORDS_EN])];

// Promotional words that suggest Marketing category
export const PROMOTIONAL_WORDS = [
  'desconto', 'oferta', 'promoção', 'compre', 'aproveite',
  'novidade', 'lançamento', 'sale', 'discount', 'offer',
  'promotion', 'buy', 'deal', 'save', 'off',
];

// URL shortener domains
export const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
  'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'short.io',
  'tiny.cc', 'lnkd.in', 'rb.gy',
];

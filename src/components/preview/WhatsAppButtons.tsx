import type { TemplateButton } from '@/lib/templateValidation';
import { ExternalLink, Phone, Copy, Share2 } from 'lucide-react';

interface WhatsAppButtonsProps {
  buttons: TemplateButton[];
}

export function WhatsAppButtons({ buttons }: WhatsAppButtonsProps) {
  if (buttons.length === 0) return null;

  const quickReplies = buttons.filter(b => b.type === 'QUICK_REPLY' || b.type === 'MARKETING_OPT_OUT');
  const ctaButtons = buttons.filter(b => !['QUICK_REPLY', 'MARKETING_OPT_OUT'].includes(b.type));

  return (
    <div className="max-w-[85%] ml-0 space-y-1 mt-1">
      {ctaButtons.map((btn, i) => (
        <button
          key={`cta-${i}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#005c4b]/80 text-[#53bdeb] text-[13px] font-medium"
        >
          {btn.type === 'URL' && <ExternalLink className="h-3 w-3" />}
          {btn.type === 'PHONE_NUMBER' && <Phone className="h-3 w-3" />}
          {btn.type === 'COPY_CODE' && <Copy className="h-3 w-3" />}
          {btn.type === 'FLOW' && <Share2 className="h-3 w-3" />}
          {btn.text || 'Botão'}
        </button>
      ))}

      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quickReplies.map((btn, i) => (
            <button
              key={`qr-${i}`}
              className="flex-1 min-w-[45%] py-1.5 rounded-lg bg-[#005c4b]/80 text-[#53bdeb] text-[12px] font-medium text-center"
            >
              {btn.text || 'Resposta'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

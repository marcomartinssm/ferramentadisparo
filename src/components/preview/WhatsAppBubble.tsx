interface WhatsAppBubbleProps {
  header?: { type: string; text?: string; mediaUrl?: string; fileName?: string; locationLatitude?: string; locationLongitude?: string; locationName?: string; locationAddress?: string };
  body: string;
  footer?: string;
  timestamp?: string;
  samples?: Record<string, string>;
}

function replaceVarsWithSamples(text: string, samples: Record<string, string>, prefix: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const sampleValue = samples[`${prefix}_${varName}`];
    return sampleValue || match;
  });
}

export function WhatsAppBubble({ header, body, footer, timestamp = '10:30', samples = {} }: WhatsAppBubbleProps) {
  const displayBody = replaceVarsWithSamples(body || '', samples, 'body');
  const displayHeaderText = header?.text ? replaceVarsWithSamples(header.text, samples, 'header') : '';

  const html = (displayBody || 'Texto da mensagem...')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/```([^`]+)```/g, '<code>$1</code>')
    .replace(/\{\{(\w+)\}\}/g, '<span class="bg-white/20 px-0.5 rounded text-[10px]">{{$1}}</span>')
    .replace(/\n/g, '<br/>');

  return (
    <div className="max-w-[85%] ml-0">
      <div className="rounded-lg bg-[#005c4b] text-white p-2 shadow-sm" style={{ borderTopLeftRadius: 0 }}>
        {/* Header */}
        {header && header.type !== 'NONE' && (
          <div className="mb-1.5">
            {header.type === 'TEXT' && displayHeaderText && (
              <p className="font-semibold text-[13px]">{displayHeaderText}</p>
            )}
            {header.type === 'IMAGE' && (
              header.mediaUrl ? (
                <img src={header.mediaUrl} alt="Header" className="w-full h-32 object-cover rounded mb-1" />
              ) : (
                <div className="w-full h-32 rounded bg-white/10 flex items-center justify-center text-white/50 text-xs mb-1">📷 Imagem</div>
              )
            )}
            {header.type === 'VIDEO' && (
              <div className="w-full h-32 rounded bg-white/10 flex items-center justify-center text-white/50 text-xs mb-1">
                {header.mediaUrl ? '▶️' : '🎬 Vídeo'}
              </div>
            )}
            {header.type === 'DOCUMENT' && (
              <div className="w-full h-12 rounded bg-white/10 flex items-center gap-2 px-3 text-white/70 text-xs mb-1">
                📄 {header.fileName || 'Documento.pdf'}
              </div>
            )}
            {header.type === 'LOCATION' && (
              header.locationLatitude && header.locationLongitude ? (
                <div className="w-full h-24 rounded bg-white/10 flex flex-col items-center justify-center text-white/60 text-xs mb-1 gap-1">
                  <span className="text-lg">📍</span>
                  <span>{header.locationName || 'Localização'}</span>
                  <span className="text-[10px] text-white/40">{header.locationLatitude}, {header.locationLongitude}</span>
                </div>
              ) : (
                <div className="w-full h-24 rounded bg-white/10 flex items-center justify-center text-white/50 text-xs mb-1">📍 Localização</div>
              )
            )}
          </div>
        )}

        {/* Body */}
        <div className="text-[13px] leading-[18px] whitespace-pre-wrap break-words">
          <span dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        {/* Footer */}
        {footer && (
          <p className="text-[11px] text-white/50 mt-1">{footer}</p>
        )}

        {/* Timestamp */}
        <div className="flex justify-end mt-0.5">
          <span className="text-[10px] text-white/40">{timestamp}</span>
        </div>
      </div>
    </div>
  );
}

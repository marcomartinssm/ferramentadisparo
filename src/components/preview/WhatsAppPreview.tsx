import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { WhatsAppBubble } from './WhatsAppBubble';
import { WhatsAppButtons } from './WhatsAppButtons';
import { Wifi, Battery, Signal } from 'lucide-react';

export function WhatsAppPreview() {
  const { state } = useTemplateWizard();

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div className="w-[280px] rounded-[2rem] border-[3px] border-border bg-[#0b141a] shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-1 text-white/60">
          <span className="text-[10px]">10:30</span>
          <div className="flex items-center gap-1">
            <Signal className="h-2.5 w-2.5" />
            <Wifi className="h-2.5 w-2.5" />
            <Battery className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* WhatsApp header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34]">
          <div className="h-8 w-8 rounded-full bg-[#2a3942] flex items-center justify-center text-white/50 text-xs">
            B
          </div>
          <div>
            <p className="text-white text-[13px] font-medium">Business</p>
            <p className="text-white/40 text-[10px]">online</p>
          </div>
        </div>

        {/* Chat area */}
        <div
          className="p-3 min-h-[350px] flex flex-col justify-end gap-1"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: '#0b141a',
          }}
        >
          <WhatsAppBubble
            header={state.header.enabled ? {
              type: state.header.type,
              text: state.header.text,
              mediaUrl: state.header.mediaUrl,
              fileName: state.header.fileName,
              locationLatitude: state.header.locationLatitude,
              locationLongitude: state.header.locationLongitude,
              locationName: state.header.locationName,
              locationAddress: state.header.locationAddress,
            } : undefined}
            body={state.body}
            footer={state.footer.enabled ? state.footer.text : undefined}
            samples={state.samples}
          />
          <WhatsAppButtons buttons={state.buttons} />
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34]">
          <div className="flex-1 h-8 rounded-full bg-[#2a3942] px-3 flex items-center text-white/30 text-[12px]">
            Mensagem
          </div>
          <div className="h-8 w-8 rounded-full bg-[#00a884] flex items-center justify-center">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.239 1.816-13.239 1.817-.011 7.912z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Lockscreen preview */}
      {state.body && (
        <div className="mt-3 w-[280px] p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Preview na tela bloqueada:</p>
          <p className="text-[11px] truncate">{state.body.slice(0, 65)}{state.body.length > 65 ? '...' : ''}</p>
        </div>
      )}
    </div>
  );
}

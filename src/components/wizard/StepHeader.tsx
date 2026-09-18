import { useTemplateWizard, type HeaderType } from '@/hooks/useTemplateWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Image, Video, FileText, MapPin, Type, Variable, Info } from 'lucide-react';
import { MediaUploader } from './MediaUploader';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const headerTypes: { value: HeaderType; label: string; icon: React.ElementType }[] = [
  { value: 'TEXT', label: 'Texto', icon: Type },
  { value: 'IMAGE', label: 'Imagem', icon: Image },
  { value: 'VIDEO', label: 'Vídeo', icon: Video },
  { value: 'DOCUMENT', label: 'Documento', icon: FileText },
  { value: 'LOCATION', label: 'Localização', icon: MapPin },
];

export function StepHeader() {
  const { state, dispatch } = useTemplateWizard();
  const { header } = state;
  const isLto = state.templateType === 'lto';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Header</Label>
          <p className="text-xs text-muted-foreground">Cabeçalho exibido acima do corpo</p>
        </div>
        {!isLto && (
          <Switch
            checked={header.enabled}
            onCheckedChange={v => dispatch({ type: 'SET_HEADER', payload: { enabled: v } })}
          />
        )}
      </div>

      {(header.enabled || isLto) && (
        <>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-5 gap-2">
              {headerTypes
                .filter(t => !isLto || t.value === 'IMAGE' || t.value === 'VIDEO')
                .map(t => (
                  <button
                    key={t.value}
                    onClick={() => dispatch({ type: 'SET_HEADER', payload: { type: t.value, enabled: true } })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all ${
                      header.type === t.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/30 text-muted-foreground'
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                ))}
            </div>
          </div>

          {header.type === 'TEXT' && (
            <div className="space-y-2">
              <Label>Texto do header</Label>
              <div className="flex items-center gap-1 p-1 rounded-md bg-muted/50 border border-border">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={header.text.includes('{{1}}')}
                          onClick={() => dispatch({ type: 'SET_HEADER', payload: { text: (header.text + '{{1}}').slice(0, 60) } })}
                        >
                          <Variable className="h-3.5 w-3.5" />
                          Variável
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {header.text.includes('{{1}}') && (
                      <TooltipContent>Máximo 1 variável no header</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                value={header.text}
                onChange={e => dispatch({ type: 'SET_HEADER', payload: { text: e.target.value.slice(0, 60) } })}
                placeholder="Ex: Olá {{1}}!"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">{header.text.length}/60 — máximo 1 variável</p>

              {header.text.includes('{{1}}') && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs text-muted-foreground">Exemplo para {'{{1}}'}</Label>
                  <Input
                    value={state.samples['header_1'] || ''}
                    onChange={e => dispatch({ type: 'SET_SAMPLES', payload: { ...state.samples, header_1: e.target.value } })}
                    placeholder="Ex: João"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.type) && (
            <MediaUploader
              headerType={header.type}
              mediaUrl={header.mediaUrl}
              fileName={header.fileName}
              onUpload={(mediaUrl, fileName) =>
                dispatch({ type: 'SET_HEADER', payload: { mediaUrl, fileName } })
              }
              onRemove={() =>
                dispatch({ type: 'SET_HEADER', payload: { mediaUrl: undefined, fileName: undefined } })
              }
            />
          )}

          {header.type === 'LOCATION' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={header.locationLatitude || ''}
                    onChange={e => dispatch({ type: 'SET_HEADER', payload: { locationLatitude: e.target.value } })}
                    placeholder="-23.5505"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={header.locationLongitude || ''}
                    onChange={e => dispatch({ type: 'SET_HEADER', payload: { locationLongitude: e.target.value } })}
                    placeholder="-46.6333"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nome do local (opcional)</Label>
                <Input
                  value={header.locationName || ''}
                  onChange={e => dispatch({ type: 'SET_HEADER', payload: { locationName: e.target.value } })}
                  placeholder="Ex: Escritório Central"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Endereço (opcional)</Label>
                <Input
                  value={header.locationAddress || ''}
                  onChange={e => dispatch({ type: 'SET_HEADER', payload: { locationAddress: e.target.value } })}
                  placeholder="Ex: Av. Paulista, 1000"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                <span>A localização será exibida como um mapa no WhatsApp</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

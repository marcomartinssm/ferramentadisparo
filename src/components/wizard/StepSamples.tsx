import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { extractAllVars, extractPositionalVars } from '@/lib/templateValidation';

export function StepSamples() {
  const { state, dispatch } = useTemplateWizard();

  const headerVars = state.header.enabled && state.header.type === 'TEXT'
    ? extractPositionalVars(state.header.text).map(n => ({ source: 'Header', key: `header_${n}`, label: `Header {{${n}}}` }))
    : [];

  const bodyVars = extractAllVars(state.body, state.parameterFormat).map(v => ({
    source: 'Body',
    key: `body_${v}`,
    label: `Body {{${v}}}`,
  }));

  const buttonVars = state.buttons.flatMap((btn, i) => {
    if (btn.type === 'URL' && btn.url) {
      const vars = extractPositionalVars(btn.url);
      return vars.map(n => ({ source: `Botão ${i + 1}`, key: `btn_${i}_${n}`, label: `Botão "${btn.text}" {{${n}}}` }));
    }
    return [];
  });

  const allVars = [...headerVars, ...bodyVars, ...buttonVars];

  const updateSample = (key: string, value: string) => {
    dispatch({ type: 'SET_SAMPLES', payload: { ...state.samples, [key]: value } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Label className="text-base">Amostras de variáveis</Label>
        <p className="text-xs text-muted-foreground">
          Forneça exemplos reais para cada variável. A Meta usa esses valores para revisar seu template.
        </p>
      </div>

      {allVars.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground text-sm">
          Nenhuma variável detectada no template.
        </div>
      ) : (
        <div className="space-y-3">
          {allVars.map(v => (
            <div key={v.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{v.source} — {v.label}</Label>
              <Input
                value={state.samples[v.key] || ''}
                onChange={e => updateSample(v.key, e.target.value)}
                placeholder={`Exemplo para ${v.label}`}
                className="h-9 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {state.header.enabled && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(state.header.type) && (
        <div>
          <Label className="text-xs text-muted-foreground">Amostra de mídia (Header)</Label>
          <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs mt-2">
            Upload de amostra de mídia (disponível em breve)
          </div>
        </div>
      )}
    </div>
  );
}

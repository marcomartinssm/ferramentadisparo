import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { validateFooter } from '@/lib/templateValidation';
import { AlertCircle } from 'lucide-react';

export function StepFooter() {
  const { state, dispatch } = useTemplateWizard();
  const { footer } = state;
  const validations = validateFooter(footer);

  const suggestOptOut = () => {
    dispatch({ type: 'SET_FOOTER', payload: { text: 'Responda SAIR para não receber mais mensagens', enabled: true } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Footer</Label>
          <p className="text-xs text-muted-foreground">Texto pequeno exibido abaixo do corpo</p>
        </div>
        <Switch
          checked={footer.enabled}
          onCheckedChange={v => dispatch({ type: 'SET_FOOTER', payload: { enabled: v } })}
        />
      </div>

      {footer.enabled && (
        <>
          <div className="space-y-2">
            <Input
              value={footer.text}
              onChange={e => dispatch({ type: 'SET_FOOTER', payload: { text: e.target.value.slice(0, 60) } })}
              placeholder="Ex: Responda SAIR para não receber mais"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">{footer.text.length}/60 — sem variáveis, sem emojis</p>
          </div>

          {state.category === 'MARKETING' && !footer.text && (
            <Button type="button" variant="outline" size="sm" onClick={suggestOptOut} className="text-xs">
              💡 Sugerir texto de opt-out
            </Button>
          )}

          {validations.map(v => (
            <div key={v.key} className="flex items-start gap-2 text-xs p-2 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{v.message}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

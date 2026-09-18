import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { validateButtons, type TemplateButton } from '@/lib/templateValidation';
import { Plus, Trash2, AlertCircle, Lightbulb } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick Reply' },
  { value: 'URL', label: 'URL' },
  { value: 'PHONE_NUMBER', label: 'Telefone' },
  { value: 'MARKETING_OPT_OUT', label: 'Opt-Out Marketing' },
  { value: 'FLOW', label: 'Flow' },
  { value: 'CATALOG', label: 'Catálogo' },
  { value: 'MPM', label: 'Multi-Produto' },
  { value: 'COPY_CODE', label: 'Copiar Código' },
];

const OTP_TYPES = [
  { value: 'COPY_CODE', label: 'Copiar código' },
  { value: 'ONE_TAP', label: 'One Tap (Android)' },
  { value: 'ZERO_TAP', label: 'Zero Tap (Android)' },
];

export function StepButtons() {
  const { state, dispatch } = useTemplateWizard();
  const isAuth = state.category === 'AUTHENTICATION';

  if (isAuth) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Label className="text-base">Botão OTP</Label>
          <p className="text-xs text-muted-foreground">Selecione o tipo de botão de autenticação</p>
        </div>
        <Select
          value={state.auth.otpType}
          onValueChange={v => dispatch({ type: 'SET_AUTH', payload: { otpType: v as any } })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OTP_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(state.auth.otpType === 'ONE_TAP' || state.auth.otpType === 'ZERO_TAP') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input
                value={state.auth.packageName}
                onChange={e => dispatch({ type: 'SET_AUTH', payload: { packageName: e.target.value } })}
                placeholder="com.example.app"
              />
            </div>
            <div className="space-y-2">
              <Label>Signature Hash</Label>
              <Input
                value={state.auth.signatureHash}
                onChange={e => dispatch({ type: 'SET_AUTH', payload: { signatureHash: e.target.value } })}
                placeholder="K8aFAINcGX7"
              />
            </div>
            {state.auth.otpType === 'ONE_TAP' && (
              <div className="space-y-2">
                <Label>Autofill Text</Label>
                <Input
                  value={state.auth.autofillText}
                  onChange={e => dispatch({ type: 'SET_AUTH', payload: { autofillText: e.target.value } })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const buttons = state.buttons;
  const validations = validateButtons(buttons);

  const getMaxButtons = (btns: TemplateButton[]) => {
    const urlCount = btns.filter(b => b.type === 'URL').length;
    return urlCount >= 2 ? 2 : 3;
  };

  const maxButtons = getMaxButtons(buttons);

  const addButton = () => {
    if (buttons.length >= maxButtons) return;
    dispatch({ type: 'SET_BUTTONS', payload: [...buttons, { type: 'QUICK_REPLY', text: '' }] });
  };

  const removeButton = (i: number) => {
    dispatch({ type: 'SET_BUTTONS', payload: buttons.filter((_, idx) => idx !== i) });
  };

  const updateButton = (i: number, updates: Partial<TemplateButton>) => {
    const updated = buttons.map((b, idx) => idx === i ? { ...b, ...updates } : b);
    dispatch({ type: 'SET_BUTTONS', payload: updated });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Botões</Label>
          <p className="text-xs text-muted-foreground">{buttons.length}/{maxButtons} botões</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= maxButtons}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {buttons.map((btn, i) => (
        <div key={i} className="p-3 rounded-lg border border-border bg-card/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Botão {i + 1}</span>
            <button onClick={() => removeButton(i)} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={btn.type} onValueChange={v => updateButton(i, { type: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUTTON_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Texto ({btn.text.length}/25)</Label>
              <Input
                value={btn.text}
                onChange={e => updateButton(i, { text: e.target.value.slice(0, 25) })}
                className="h-8 text-xs"
                placeholder="Texto do botão"
                maxLength={25}
              />
            </div>
          </div>
          {btn.type === 'URL' && (
            <div className="space-y-2">
              <Label className="text-xs">URL</Label>
              <div className="flex">
                <span className="inline-flex items-center px-2 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs select-none">
                  https://
                </span>
                <Input
                  value={(btn.url || '').replace(/^https?:\/\//, '')}
                  onChange={e => {
                    const raw = e.target.value.replace(/^https?:\/\//, '');
                    updateButton(i, { url: raw ? `https://${raw}` : '' });
                  }}
                  className="h-8 text-xs rounded-l-none border-l-0"
                  placeholder="exemplo.com/pagina"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={!!(btn.url && btn.url.includes('{{1}}'))}
                  onCheckedChange={(checked) => {
                    const current = (btn.url || '').replace(/\/?\{\{1\}\}/, '');
                    updateButton(i, { url: checked ? `${current}/{{1}}` : current });
                  }}
                />
                <span className="text-xs text-muted-foreground">URL dinâmica (com variável)</span>
              </label>
            </div>
          )}
          {btn.type === 'PHONE_NUMBER' && (
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={btn.phone || ''}
                onChange={e => updateButton(i, { phone: e.target.value })}
                className="h-8 text-xs"
                placeholder="+5511999999999"
              />
            </div>
          )}
          {btn.type === 'FLOW' && (
            <div>
              <Label className="text-xs">Flow ID</Label>
              <Input
                value={btn.flowId || ''}
                onChange={e => updateButton(i, { flowId: e.target.value })}
                className="h-8 text-xs"
                placeholder="ID do WhatsApp Flow"
              />
            </div>
          )}
          {btn.type === 'COPY_CODE' && (
            <div>
              <Label className="text-xs">Código do cupom (max 15)</Label>
              <Input
                value={btn.couponCode || ''}
                onChange={e => updateButton(i, { couponCode: e.target.value.slice(0, 15) })}
                className="h-8 text-xs"
                placeholder="DESCONTO20"
                maxLength={15}
              />
            </div>
          )}
        </div>
      ))}

      {validations.map(v => (
        <div key={v.key} className="flex items-start gap-2 text-xs p-2 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{v.message}</span>
        </div>
      ))}

      <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <span>Quick Reply e CTAs aumentam significativamente o engajamento.</span>
      </div>
    </div>
  );
}

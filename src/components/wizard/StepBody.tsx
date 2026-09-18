import { useRef } from 'react';
import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateBody, countEmojis, extractAllVars } from '@/lib/templateValidation';
import { Input } from '@/components/ui/input';
import { Bold, Italic, Strikethrough, Code, Variable, Lightbulb, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';

export function StepBody() {
  const { state, dispatch } = useTemplateWizard();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAuth = state.category === 'AUTHENTICATION';
  const maxChars = (state.category === 'MARKETING' || state.category === 'UTILITY') ? 550 : 1024;
  const emojiCount = countEmojis(state.body);
  const validations = validateBody(state.body, state.category, state.parameterFormat);

  const renumberVariables = () => {
    let counter = 0;
    const newBody = state.body.replace(/\{\{\d+\}\}/g, () => {
      counter++;
      return `{{${counter}}}`;
    });
    dispatch({ type: 'SET_FIELD', field: 'body', value: newBody });
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? state.body.length;
    const end = el?.selectionEnd ?? state.body.length;
    const newBody = state.body.slice(0, start) + text + state.body.slice(end);
    dispatch({ type: 'SET_FIELD', field: 'body', value: newBody });
    const cursorPos = start + text.length;
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertFormat = (prefix: string, suffix: string) => {
    insertAtCursor(prefix + 'texto' + suffix);
  };

  const insertVariable = () => {
    if (state.parameterFormat === 'NAMED') {
      insertAtCursor('{{nome_variavel}}');
    } else {
      const existing = state.body.match(/\{\{(\d+)\}\}/g) || [];
      const next = existing.length + 1;
      insertAtCursor(`{{${next}}}`);
    }
  };

  if (isAuth) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Label className="text-base">Corpo (Authentication)</Label>
          <p className="text-xs text-muted-foreground">O corpo de templates de autenticação é pré-definido pela Meta.</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 border border-border font-mono text-sm">
          {'{{1}} é o seu código de verificação.'}
          {state.auth.addSecurityRecommendation && (
            <span className="text-muted-foreground"> Não compartilhe este código.</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="security"
            checked={state.auth.addSecurityRecommendation}
            onChange={e => dispatch({ type: 'SET_AUTH', payload: { addSecurityRecommendation: e.target.checked } })}
            className="rounded border-border"
          />
          <Label htmlFor="security" className="font-normal text-sm cursor-pointer">Adicionar recomendação de segurança</Label>
        </div>
        <div className="space-y-2">
          <Label>Código expira em (minutos)</Label>
          <input
            type="number"
            min={1}
            max={90}
            value={state.auth.codeExpirationMinutes}
            onChange={e => dispatch({ type: 'SET_AUTH', payload: { codeExpirationMinutes: Number(e.target.value) } })}
            className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Time-to-live (segundos)</Label>
          <input
            type="number"
            min={60}
            max={600}
            value={state.auth.ttlSeconds}
            onChange={e => dispatch({ type: 'SET_AUTH', payload: { ttlSeconds: Number(e.target.value) } })}
            className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Tempo máximo de tentativa de entrega (60-600s)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Corpo da mensagem</Label>
          <p className="text-xs text-muted-foreground">Texto principal exibido no WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">Emojis: {emojiCount}/10</Badge>
          <Badge variant={state.body.length > maxChars ? "destructive" : "outline"} className="text-[10px]">
            {state.body.length}/{maxChars}
          </Badge>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 p-1 rounded-md bg-muted/50 border border-border">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('*', '*')} title="Negrito">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('_', '_')} title="Itálico">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('~', '~')} title="Tachado">
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => insertFormat('```', '```')} title="Mono">
          <Code className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={insertVariable}>
          <Variable className="h-3.5 w-3.5" />
          Variável
        </Button>
      </div>

      <Textarea
        value={state.body}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'body', value: e.target.value })}
        placeholder="Digite o corpo da mensagem..."
        className="min-h-[180px] font-mono text-sm resize-none"
        ref={textareaRef}
      />

      {/* Inline variable samples */}
      {(() => {
        const vars = extractAllVars(state.body, state.parameterFormat);
        if (vars.length === 0) return null;
        return (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
            <Label className="text-xs text-muted-foreground">Exemplos de variáveis</Label>
            {vars.map(v => (
              <div key={v} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">{`{{${v}}}`}</Label>
                <Input
                  value={state.samples[`body_${v}`] || ''}
                  onChange={e => dispatch({ type: 'SET_SAMPLES', payload: { ...state.samples, [`body_${v}`]: e.target.value } })}
                  placeholder={`Ex: valor para {{${v}}}`}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Validations */}
      {validations.length > 0 && (
        <div className="space-y-1.5">
          {validations.map(v => (
            <div key={v.key} className={`flex items-start gap-2 text-xs p-2 rounded-md ${
              v.severity === 'error' ? 'bg-destructive/10 text-destructive' :
              v.severity === 'warning' ? 'bg-warning/10 text-warning' :
              'bg-primary/10 text-primary'
            }`}>
              {v.severity === 'error' ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
               v.severity === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
               <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
              <span className="flex-1">{v.message}</span>
              {v.key === 'body_vars_sequential' && (
                <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1 shrink-0" onClick={renumberVariables}>
                  <RefreshCw className="h-3 w-3" /> Renumerar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="space-y-2 pt-2">
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          <span>Os primeiros 60-65 caracteres são visíveis na tela bloqueada. Coloque a informação mais importante no início.</span>
        </div>
        {state.category === 'MARKETING' && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>Mensagens de marketing com mais de 5 linhas são truncadas com "Leia mais".</span>
          </div>
        )}
      </div>
    </div>
  );
}

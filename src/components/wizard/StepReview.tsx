import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  validateTemplateName, validateBody, validateHeader, validateFooter,
  validateButtons, detectCategoryMismatch, calculateApprovalScore,
  countEmojis, type ValidationResult,
} from '@/lib/templateValidation';
import { Check, X, AlertTriangle, Send, Lightbulb, ArrowRight, Loader2 } from 'lucide-react';
import { getLanguageName } from '@/lib/metaLanguages';
import { toast } from 'sonner';

function getStepForValidation(key: string): { label: string; stepKey: string } | null {
  if (key.startsWith('name_')) return { label: 'Informações Básicas', stepKey: 'basic' };
  if (key.startsWith('header_')) return { label: 'Header', stepKey: 'header' };
  if (key.startsWith('body_')) return { label: 'Corpo', stepKey: 'body' };
  if (key.startsWith('footer_')) return { label: 'Footer', stepKey: 'footer' };
  if (key.startsWith('btn') || key.startsWith('buttons_')) return { label: 'Botões', stepKey: 'buttons' };
  if (key.startsWith('category_')) return { label: 'Informações Básicas', stepKey: 'basic' };
  return null;
}

export function StepReview() {
  const { state, steps, goToStep } = useTemplateWizard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!state.metaConnectionId) {
      toast.error('Selecione uma conexão Meta nas Informações Básicas antes de submeter.');
      return;
    }
    setLoading(true);
    try {
      const components: any[] = [];
      if (state.header.enabled && state.header.type !== 'NONE') {
        const headerComp: any = { type: 'HEADER', format: state.header.type, text: state.header.text };
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(state.header.type) && state.header.mediaUrl) {
          headerComp.mediaUrl = state.header.mediaUrl;
        }
        if (state.header.type === 'LOCATION') {
          headerComp.locationLatitude = state.header.locationLatitude;
          headerComp.locationLongitude = state.header.locationLongitude;
          headerComp.locationName = state.header.locationName;
          headerComp.locationAddress = state.header.locationAddress;
        }
        components.push(headerComp);
      }
      components.push({ type: 'BODY', text: state.body });
      if (state.footer.enabled && state.footer.text) {
        components.push({ type: 'FOOTER', text: state.footer.text });
      }
      if (state.buttons.length > 0) {
        components.push({ type: 'BUTTONS', buttons: state.buttons });
      }

      const { data, error } = await supabase.functions.invoke('submit-template', {
        body: {
          templateData: {
            name: state.name,
            category: state.category,
            language: state.language,
            components,
            samples: state.samples,
            labels: state.labels.length > 0 ? state.labels : null,
            validation_score: score,
          },
          metaConnectionId: state.metaConnectionId,
          isEdit: state.isEditing,
          templateId: state.templateId,
          metaTemplateId: state.metaTemplateId,
        },
      });

      if (error) {
        // A mensagem real (ex.: motivo da recusa da Meta) vem no corpo da resposta
        let detail = '';
        try {
          const body = await (error as any).context?.json();
          detail = body?.error || '';
        } catch { /* corpo não era JSON */ }
        throw new Error(detail || error.message);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(state.isEditing
        ? 'Template atualizado e reenviado para aprovação!'
        : 'Template enviado para a Meta com sucesso! Aguardando aprovação.'
      );
      navigate('/messages');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao submeter template.');
      setLoading(false);
    }
  };

  const nameResults = validateTemplateName(state.name);
  const bodyResults = validateBody(state.body, state.category, state.parameterFormat);
  const headerResults = validateHeader(state.header);
  const footerResults = validateFooter(state.footer);
  const buttonResults = validateButtons(state.buttons);
  const categoryMismatch = detectCategoryMismatch(state.category, state.body);

  const allResults: ValidationResult[] = [
    ...nameResults, ...bodyResults, ...headerResults, ...footerResults, ...buttonResults,
    ...(categoryMismatch ? [categoryMismatch] : []),
  ];

  const errors = allResults.filter(r => r.severity === 'error');
  const warnings = allResults.filter(r => r.severity === 'warning');

  const maxChars = (state.category === 'MARKETING' || state.category === 'UTILITY') ? 550 : 1024;
  const score = calculateApprovalScore({
    bodyLength: state.body.length,
    maxBodyLength: maxChars,
    emojiCount: countEmojis(state.body),
    hasVarIssues: bodyResults.some(r => r.key.includes('var') && r.severity === 'error'),
    hasAdjacentVars: bodyResults.some(r => r.key === 'body_vars_adjacent'),
    hasHeaderEmoji: headerResults.some(r => r.key === 'header_emoji'),
    hasWameLink: buttonResults.some(r => r.key === 'btn_wame'),
    isGenericName: nameResults.some(r => r.key === 'name_generic'),
    hasSensitiveData: bodyResults.some(r => r.key === 'body_sensitive'),
    categoryMatchOk: !categoryMismatch || categoryMismatch.severity !== 'warning',
    hasSpam: bodyResults.some(r => r.key === 'body_spam'),
    hasBrandName: true,
    hasOptOut: state.category !== 'MARKETING' || state.footer.text.toLowerCase().includes('sair'),
    footerValid: footerResults.length === 0,
    buttonsValid: buttonResults.filter(r => r.severity === 'error').length === 0,
    varRatioOk: !bodyResults.some(r => r.key === 'body_var_ratio'),
  });

  const scoreColor = score >= 80 ? 'text-primary' : score >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Score */}
      <div className="text-center p-6 rounded-xl border border-border bg-card/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Probabilidade de Aprovação</p>
        <p className={`text-5xl font-bold ${scoreColor}`}>{score}%</p>
        <p className="text-xs text-muted-foreground mt-2">
          {errors.length} erro(s) · {warnings.length} alerta(s)
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-xs text-muted-foreground">Nome</span>
          <p className="font-mono text-xs mt-1">{state.name || '—'}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-xs text-muted-foreground">Categoria</span>
          <p className="mt-1">{state.category}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-xs text-muted-foreground">Idioma</span>
          <p className="mt-1">{getLanguageName(state.language)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-xs text-muted-foreground">Tipo</span>
          <p className="mt-1 capitalize">{state.templateType}</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium mb-2">Checklist de validação</p>
        {allResults.map(r => {
          const stepInfo = getStepForValidation(r.key);
          const stepIndex = stepInfo ? steps.findIndex(s => s.key === stepInfo.stepKey) : -1;
          return (
            <div key={r.key} className={`flex items-start gap-2 text-xs p-2 rounded-md ${
              r.severity === 'error' ? 'bg-destructive/10 text-destructive' :
              r.severity === 'warning' ? 'bg-warning/10 text-warning' :
              'bg-primary/10 text-primary'
            }`}>
              {r.severity === 'error' ? <X className="h-3.5 w-3.5 shrink-0 mt-0.5" /> :
               <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
              <span className="flex-1">{r.message}</span>
              {stepInfo && stepIndex >= 0 && (
                <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-0.5 px-1.5 shrink-0" onClick={() => goToStep(stepIndex)}>
                  Ir para {stepInfo.label} <ArrowRight className="h-2.5 w-2.5" />
                </Button>
              )}
            </div>
          );
        })}
        {allResults.length === 0 && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-primary/10 text-primary">
            <Check className="h-3.5 w-3.5" />
            <span>Todas as validações passaram!</span>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded-md bg-muted/30">
        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
        <span>Limite marketing a 2 msgs/usuário/dia, segmente por engajamento e monitore qualidade proativamente.</span>
      </div>

      {/* Submit */}
      <Button className="w-full h-12" disabled={errors.length > 0 || loading} onClick={handleSubmit}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        {loading ? 'Submetendo...' : state.isEditing ? 'Atualizar Template' : 'Submeter Template'}
      </Button>
      {errors.length > 0 && (
        <p className="text-center text-xs text-destructive">Corrija os erros acima antes de submeter</p>
      )}
    </div>
  );
}

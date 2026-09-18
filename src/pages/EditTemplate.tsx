import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WizardProvider, useTemplateWizard, type TemplateState, type TemplateCategory, type HeaderType } from '@/hooks/useTemplateWizard';
import { WizardProgress } from '@/components/wizard/WizardProgress';
import { StepBasicInfo } from '@/components/wizard/StepBasicInfo';
import { StepHeader } from '@/components/wizard/StepHeader';
import { StepBody } from '@/components/wizard/StepBody';
import { StepFooter } from '@/components/wizard/StepFooter';
import { StepButtons } from '@/components/wizard/StepButtons';
import { StepSamples } from '@/components/wizard/StepSamples';
import { StepReview } from '@/components/wizard/StepReview';
import { StepCarouselCards } from '@/components/wizard/StepCarouselCards';
import { WhatsAppPreview } from '@/components/preview/WhatsAppPreview';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function parseTemplateToState(template: any): TemplateState {
  const components = template.components || [];
  const headerComp = components.find((c: any) => c.type === 'HEADER');
  const bodyComp = components.find((c: any) => c.type === 'BODY');
  const footerComp = components.find((c: any) => c.type === 'FOOTER');
  const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');

  return {
    isEditing: true,
    templateId: template.id,
    metaTemplateId: template.meta_template_id,
    name: template.name,
    category: template.category as TemplateCategory,
    language: template.language,
    parameterFormat: 'POSITIONAL',
    templateType: 'standard',
    labels: template.labels || [],
    metaConnectionId: template.meta_connection_id,
    header: headerComp
      ? {
          enabled: true,
          type: (headerComp.format || 'TEXT') as HeaderType,
          text: headerComp.text || '',
          mediaUrl: headerComp.mediaUrl,
        }
      : { enabled: false, type: 'NONE', text: '' },
    body: bodyComp?.text || '',
    carouselCards: [
      { mediaType: 'IMAGE', body: '', buttons: [] },
      { mediaType: 'IMAGE', body: '', buttons: [] },
    ],
    footer: footerComp
      ? { enabled: true, text: footerComp.text || '' }
      : { enabled: false, text: '' },
    buttons: buttonsComp?.buttons || [],
    samples: (template.samples as Record<string, string>) || {},
    auth: {
      addSecurityRecommendation: false,
      codeExpirationMinutes: 5,
      otpType: 'COPY_CODE',
      packageName: '',
      signatureHash: '',
      autofillText: 'Preencher automaticamente',
      ttlSeconds: 300,
    },
    currentStep: 0,
  };
}

function EditWizardContent() {
  const { state, steps, nextStep, prevStep, dispatch } = useTemplateWizard();
  const { id: templateId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('meta_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (error || !data) {
        toast.error('Template não encontrado.');
        navigate('/messages');
        return;
      }
      dispatch({ type: 'LOAD_TEMPLATE', payload: parseTemplateToState(data) });
      setLoadingTemplate(false);
    };
    load();
  }, [templateId]);

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStepKey = steps[state.currentStep]?.key;

  const renderStep = () => {
    switch (currentStepKey) {
      case 'basic': return <StepBasicInfo />;
      case 'header': return <StepHeader />;
      case 'body': return <StepBody />;
      case 'carousel': return <StepCarouselCards />;
      case 'footer': return <StepFooter />;
      case 'buttons': return <StepButtons />;
      case 'samples': return <StepSamples />;
      case 'review': return <StepReview />;
      default: return <StepBasicInfo />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Editar Template</h1>
          <p className="text-sm text-muted-foreground">{state.name || 'Carregando...'}</p>
        </div>
      </div>

      <WizardProgress />

      <div className={`flex gap-6 ${isMobile ? 'flex-col' : ''}`}>
        <div className={`flex-1 ${isMobile ? '' : 'max-w-xl'}`}>
          <div className="rounded-xl border border-border bg-card p-5">
            {renderStep()}
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={prevStep} disabled={state.currentStep === 0} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] bg-background">
                  <div className="flex justify-center pt-4">
                    <WhatsAppPreview />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {state.currentStep < steps.length - 1 && (
              <Button onClick={nextStep} className="gap-1">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {!isMobile && (
          <div className="sticky top-4 self-start">
            <WhatsAppPreview />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditTemplate() {
  return (
    <WizardProvider>
      <EditWizardContent />
    </WizardProvider>
  );
}

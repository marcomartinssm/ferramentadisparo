import { useState } from "react";
import { WizardProvider, useTemplateWizard } from "@/hooks/useTemplateWizard";
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { StepBasicInfo } from "@/components/wizard/StepBasicInfo";
import { StepHeader } from "@/components/wizard/StepHeader";
import { StepBody } from "@/components/wizard/StepBody";
import { StepFooter } from "@/components/wizard/StepFooter";
import { StepButtons } from "@/components/wizard/StepButtons";
import { StepSamples } from "@/components/wizard/StepSamples";
import { StepReview } from "@/components/wizard/StepReview";
import { StepCarouselCards } from "@/components/wizard/StepCarouselCards";
import { WhatsAppPreview } from "@/components/preview/WhatsAppPreview";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, ArrowLeft, Save, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function WizardContent() {
  const { state, steps, nextStep, prevStep } = useTemplateWizard();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [savingDraft, setSavingDraft] = useState(false);
  const currentStepKey = steps[state.currentStep]?.key;

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftName = state.name.trim() || `Rascunho ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
      const components: any[] = [];
      if (state.header.enabled && state.header.type !== 'NONE') {
        components.push({ type: 'HEADER', format: state.header.type, text: state.header.text, mediaUrl: state.header.mediaUrl });
      }
      if (state.body) components.push({ type: 'BODY', text: state.body });
      if (state.footer.enabled && state.footer.text) components.push({ type: 'FOOTER', text: state.footer.text });
      if (state.buttons.length > 0) components.push({ type: 'BUTTONS', buttons: state.buttons });

      if (state.isEditing && state.templateId) {
        const { error } = await supabase.from('meta_templates').update({
          name: draftName, category: state.category, language: state.language,
          components, samples: state.samples, labels: state.labels.length > 0 ? state.labels : [],
          meta_connection_id: state.metaConnectionId, status: 'draft',
        }).eq('id', state.templateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meta_templates').insert({
          name: draftName, category: state.category, language: state.language,
          components, samples: state.samples, labels: state.labels.length > 0 ? state.labels : [],
          meta_connection_id: state.metaConnectionId, status: 'draft',
        });
        if (error) throw error;
      }
      toast.success('Rascunho salvo!');
      navigate('/messages');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/messages')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Criar Template Meta</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {steps[state.currentStep]?.title} — {steps[state.currentStep]?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <WizardProgress />

      <div className={`flex gap-6 ${isMobile ? 'flex-col' : ''}`}>
        {/* Wizard panel */}
        <div className={`flex-1 ${isMobile ? '' : 'max-w-xl'}`}>
          <div className="p-5 rounded-xl border border-border bg-card/50">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={state.currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="gap-1"
              >
                {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar Rascunho
              </Button>
            </div>

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

        {/* Desktop preview */}
        {!isMobile && (
          <div className="sticky top-4 self-start">
            <WhatsAppPreview />
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateTemplate() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}

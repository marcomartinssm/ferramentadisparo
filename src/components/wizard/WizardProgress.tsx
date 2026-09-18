import { useTemplateWizard } from '@/hooks/useTemplateWizard';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WizardProgress() {
  const { state, steps, goToStep } = useTemplateWizard();

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isActive = i === state.currentStep;
        const isCompleted = i < state.currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => goToStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap",
                isActive && "bg-primary/15 text-primary border border-primary/30",
                isCompleted && "bg-primary/10 text-primary/80",
                !isActive && !isCompleted && "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border",
                isActive && "border-primary bg-primary text-primary-foreground",
                isCompleted && "border-primary/60 bg-primary/20 text-primary",
                !isActive && !isCompleted && "border-border"
              )}>
                {isCompleted ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn("w-4 h-px mx-1", isCompleted ? "bg-primary/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

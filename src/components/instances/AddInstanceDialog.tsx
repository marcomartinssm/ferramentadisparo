import React, { useState } from 'react';
import { Loader2, CheckCircle, ArrowRight, Smartphone, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AddInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'credentials' | 'saving' | 'connected';

export function AddInstanceDialog({ open, onOpenChange }: AddInstanceDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('credentials');
  const [name, setName] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    if (!wabaId.trim()) errs.wabaId = 'WABA ID obrigatório';
    if (!accessToken.trim()) errs.accessToken = 'Access Token obrigatório';
    if (!phoneNumberId.trim()) errs.phoneNumberId = 'Phone Number ID obrigatório';
    if (wabaId.trim() && phoneNumberId.trim() && wabaId.trim() === phoneNumberId.trim()) {
      errs.phoneNumberId = 'Phone Number ID deve ser diferente do WABA ID';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setStep('saving');

    try {
      // 1. Insert meta_connection
      const { data: metaConn, error: metaError } = await supabase
        .from('meta_connections')
        .insert({
          waba_id: wabaId.trim(),
          access_token: accessToken.trim(),
          phone_number_id: phoneNumberId.trim(),
        })
        .select('id')
        .single();

      if (metaError) throw new Error(metaError.message);

      // 2. Create whatsapp_instance linked to meta_connection
      const instanceName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
      const { error: instanceError } = await supabase
        .from('whatsapp_instances')
        .insert({
          name: name.trim(),
          instance_name: instanceName,
          provider_type: 'official',
          meta_connection_id: metaConn.id,
          status: 'connected',
          is_default: isDefault,
        });

      if (instanceError) throw new Error(instanceError.message);

      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      setStep('connected');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
      setStep('credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('credentials');
    setName('');
    setWabaId('');
    setAccessToken('');
    setPhoneNumberId('');
    setIsDefault(false);
    setShowToken(false);
    setErrors({});
    onOpenChange(false);
  };

  const stepLabels = ['Credenciais', 'Conectado'];
  const stepIndex = step === 'credentials' || step === 'saving' ? 0 : 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
          <DialogDescription>Conecte via API Oficial da Meta (WhatsApp Business)</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${i <= stepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border
                  ${i < stepIndex ? 'bg-primary border-primary text-primary-foreground' :
                    i === stepIndex ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                  {i < stepIndex ? '✓' : i + 1}
                </div>
                {label}
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-px ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {(step === 'credentials' || step === 'saving') && (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da Conexão</Label>
              <Input id="name" placeholder="Ex: WhatsApp Vendas" value={name} onChange={e => setName(e.target.value)} disabled={isSaving} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wabaId">WABA ID <span className="text-muted-foreground font-normal ml-1 text-xs">(WhatsApp Business Account)</span></Label>
              <Input id="wabaId" placeholder="Ex: 123456789012345" value={wabaId} onChange={e => setWabaId(e.target.value)} disabled={isSaving} />
              {errors.wabaId && <p className="text-xs text-destructive">{errors.wabaId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumberId">Phone Number ID</Label>
              <Input id="phoneNumberId" placeholder="Ex: 987654321098765" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} disabled={isSaving} />
              {errors.phoneNumberId && <p className="text-xs text-destructive">{errors.phoneNumberId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accessToken">Access Token <span className="text-muted-foreground font-normal ml-1 text-xs">(permanente)</span></Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showToken ? 'text' : 'password'}
                  placeholder="Seu token de acesso permanente"
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                  disabled={isSaving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.accessToken && <p className="text-xs text-destructive">{errors.accessToken}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="w-4 h-4 accent-primary" />
              <Label htmlFor="isDefault" className="font-normal cursor-pointer">Definir como instância padrão</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleClose} disabled={isSaving}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={isSaving || !name.trim()} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isSaving ? 'Conectando...' : 'Conectar'}
              </Button>
            </div>
          </div>
        )}

        {step === 'connected' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground text-lg">WhatsApp Conectado!</p>
              <p className="text-sm text-muted-foreground mt-1">A conexão <strong>{name}</strong> está configurada e pronta para uso.</p>
            </div>
            <Button onClick={handleClose} className="gap-2 mt-2"><Smartphone className="w-4 h-4" />Concluir</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

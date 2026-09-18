import React, { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw, Wifi, WifiOff, Trash2, Star, MoreVertical, Smartphone, Cloud, Settings2, Power, Eye, EyeOff, Copy } from 'lucide-react';
import { useWhatsAppInstances, WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { AddInstanceDialog } from './AddInstanceDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from
'@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from
'@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const providerLabels: Record<string, string> = {
  official: 'API Oficial (Meta)',
};

interface InstanceSettings {
  webhook_enabled: boolean;
}

export function WhatsAppInstancesManager() {
  const { instances, isLoading, refetch, deleteInstance, setDefaultInstance } = useWhatsAppInstances();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogInstance, setDeleteDialogInstance] = useState<WhatsAppInstance | null>(null);

  // Settings modal state
  const [settingsInstance, setSettingsInstance] = useState<WhatsAppInstance | null>(null);
  const [settingsValues, setSettingsValues] = useState<InstanceSettings>({
    webhook_enabled: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Fetch meta_connection data when settings modal opens
  const { data: metaConnection } = useQuery({
    queryKey: ['meta-connection', settingsInstance?.meta_connection_id],
    queryFn: async () => {
      if (!settingsInstance?.meta_connection_id) return null;
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('id', settingsInstance.meta_connection_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!settingsInstance?.meta_connection_id,
  });

  const openSettingsModal = (instance: WhatsAppInstance) => {
    const meta = instance.metadata as Record<string, unknown> ?? {};
    setSettingsInstance(instance);
    setShowToken(false);
    setSettingsValues({
      webhook_enabled: meta.webhook_enabled !== false
    });
  };

  const handleSaveSettings = async () => {
    if (!settingsInstance) return;
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.
      from('whatsapp_instances').
      update({
        metadata: {
          ...(settingsInstance.metadata as Record<string, unknown> ?? {}),
          webhook_enabled: settingsValues.webhook_enabled
        }
      }).
      eq('id', settingsInstance.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Configurações salvas com sucesso');
      setSettingsInstance(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar configurações: ${msg}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDelete = async () => {
    if (deleteDialogInstance) {
      await deleteInstance.mutateAsync(deleteDialogInstance.id);
      setDeleteDialogInstance(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const maskToken = (token: string) => {
    if (token.length <= 12) return '••••••••';
    return token.slice(0, 6) + '••••••' + token.slice(-6);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20"><Wifi className="w-3 h-3" />Conectado</span>;
      case 'connecting':return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"><RefreshCw className="w-3 h-3 animate-spin" />Conectando</span>;
      default:return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border"><WifiOff className="w-3 h-3" />Desconectado</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Canais de WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas conexões WhatsApp Business</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova Conexão</Button>
        </div>
      </div>

      {isLoading ?
      <div className="flex items-center justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div> :
      instances.length === 0 ?
      <div className="text-center p-8 border border-dashed border-border rounded-lg glass-card">
          <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">Nenhuma conexão configurada</p>
          <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Adicionar Conexão</Button>
        </div> :

      <div className="space-y-3">
          {instances.map((instance) =>
        <div key={instance.id} className="glass-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10"><Cloud className="w-4 h-4" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{instance.name}</span>
                      {instance.is_default && <Star className="w-4 h-4 text-warning fill-warning" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{providerLabels[instance.provider_type] ?? instance.provider_type}</span>
                      {instance.phone_number && <><span>•</span><span>{instance.phone_number}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(instance.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openSettingsModal(instance)}>
                        <Settings2 className="w-4 h-4 mr-2" />Configurações
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!instance.is_default &&
                  <DropdownMenuItem onClick={() => setDefaultInstance.mutate(instance.id)}>
                          <Star className="w-4 h-4 mr-2" />Definir como Padrão
                        </DropdownMenuItem>
                  }
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialogInstance(instance)}>
                        <Trash2 className="w-4 h-4 mr-2" />Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
        )}
        </div>
      }

      <AddInstanceDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {/* Settings Modal */}
      <Dialog open={!!settingsInstance} onOpenChange={(open) => !open && setSettingsInstance(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Configurações — {settingsInstance?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Instance Info */}
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Dados da Conexão</h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="font-medium text-foreground">{settingsInstance?.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provedor</span>
                  <span className="font-medium text-foreground">{providerLabels[settingsInstance?.provider_type ?? ''] ?? settingsInstance?.provider_type}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {settingsInstance && getStatusBadge(settingsInstance.status)}
                </div>

                {settingsInstance?.phone_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Telefone</span>
                    <span className="font-medium text-foreground">{settingsInstance.phone_number}</span>
                  </div>
                )}

                {metaConnection && (
                  <>
                    <div className="h-px bg-border my-1" />

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">WABA ID</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">{metaConnection.waba_id}</span>
                        <button onClick={() => copyToClipboard(metaConnection.waba_id, 'WABA ID')} className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Phone Number ID</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">{metaConnection.phone_number_id}</span>
                        <button onClick={() => copyToClipboard(metaConnection.phone_number_id, 'Phone Number ID')} className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Access Token</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-foreground">
                          {showToken ? metaConnection.access_token : maskToken(metaConnection.access_token)}
                        </span>
                        <button onClick={() => setShowToken(!showToken)} className="text-muted-foreground hover:text-foreground">
                          {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => copyToClipboard(metaConnection.access_token, 'Access Token')} className="text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Webhook (Recebimento de mensagens)</h3>
              <p className="text-xs text-muted-foreground">Configure esta URL no Meta App Dashboard → WhatsApp → Configuration → Callback URL</p>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Callback URL</span>
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded break-all flex-1">
                      {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-webhook`}
                    </code>
                    <button onClick={() => copyToClipboard(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/meta-webhook`, 'Webhook URL')} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Verify Token</span>
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">zapdisparo-webhook-verify</code>
                    <button onClick={() => copyToClipboard('zapdisparo-webhook-verify', 'Verify Token')} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Assine o campo <strong>messages</strong> nos webhooks do Meta.</p>
              </div>
            </div>

            {/* Webhook Enabled */}
            <div className="divide-y divide-border rounded-lg border border-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Power className="w-4 h-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Webhook Ativo</p>
                    <p className="text-xs text-muted-foreground">Desative para pausar o recebimento de mensagens desta instância</p>
                  </div>
                </div>
                <Switch
                  checked={settingsValues.webhook_enabled}
                  onCheckedChange={(val) => setSettingsValues((prev) => ({ ...prev, webhook_enabled: val }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsInstance(null)} disabled={isSavingSettings}>Cancelar</Button>
            <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar Configurações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDialogInstance} onOpenChange={(open) => !open && setDeleteDialogInstance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação irá desativar a conexão "{deleteDialogInstance?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}
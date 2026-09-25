import React, { useState, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Send, Loader2, AlertTriangle, Users, FileSpreadsheet, Check, Link2, GitBranch, FileText, Mic, LayoutGrid, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import CsvUploader from './CsvUploader';
import WhatsAppPhonePreview from '@/components/messages/WhatsAppPhonePreview';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useBroadcasts, CreateCampaignInput, BroadcastCampaign } from '@/hooks/useBroadcasts';
import { useContacts, Contact, ContactList } from '@/hooks/useContacts';
import { useDispatchProfiles } from '@/hooks/useDispatchProfiles';
import { useFlows } from '@/hooks/useFlows';

import { normalizeBrazilianPhone } from '@/lib/phoneUtils';
import { cn } from '@/lib/utils';

interface CampaignWizardProps { onClose: () => void; onCampaignCreated: (campaign: BroadcastCampaign) => void; editingCampaign?: BroadcastCampaign | null; }

type SourceType = 'contacts' | 'csv';

const CampaignWizard: React.FC<CampaignWizardProps> = ({ onClose, onCampaignCreated, editingCampaign }) => {
  const queryClient = useQueryClient();
  // Source selection
  const [sourceType, setSourceType] = useState<SourceType | null>(editingCampaign ? 'contacts' : null);

  // CSV state
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>(editingCampaign?.column_mapping ? (editingCampaign.column_mapping as Record<string, string>) : {});
  const [customFields, setCustomFields] = useState<string[]>(editingCampaign?.custom_fields ?? []);
  const [newFieldName, setNewFieldName] = useState('');

  // Contacts/lists selection state
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  // Common state
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState(editingCampaign?.name ?? '');
  const [template, setTemplate] = useState(editingCampaign?.message_template ?? '');
  const [instanceId, setInstanceId] = useState(editingCampaign?.instance_id ?? '');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>(editingCampaign?.instance_ids ?? []);
  const [rotationStrategy, setRotationStrategy] = useState(editingCampaign?.rotation_strategy ?? 'single');
  const [speedProfile, setSpeedProfile] = useState<string>('');
  const [delayMin, setDelayMin] = useState(editingCampaign ? Math.round(editingCampaign.delay_min_ms / 1000) : 25);
  const [delayMax, setDelayMax] = useState(editingCampaign ? Math.round(editingCampaign.delay_max_ms / 1000) : 45);
  const [batchSize, setBatchSize] = useState(editingCampaign?.batch_size ?? 20);
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(editingCampaign ? Math.round(editingCampaign.delay_between_batches / 60) : 10);
  const [delayBetweenBatchesMax, setDelayBetweenBatchesMax] = useState(editingCampaign ? Math.round(editingCampaign.delay_between_batches_max / 60) : 15);
  const [selectedMessageType, setSelectedMessageType] = useState<string>(editingCampaign?.message_type ?? 'text');
  const [selectedVoiceProfileId, setSelectedVoiceProfileId] = useState<string>(editingCampaign?.voice_profile_id ?? '');
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [selectedMediaUrls, setSelectedMediaUrls] = useState<string[]>([]);
  const [selectedMediaRotationMode, setSelectedMediaRotationMode] = useState<string>('random');
  const [selectedFlowId, setSelectedFlowId] = useState<string>(editingCampaign?.flow_id ?? '');
  const [templateViewMode, setTemplateViewMode] = useState<'grid' | 'list'>('list');
  const [selectedTemplateHeaderText, setSelectedTemplateHeaderText] = useState<string>('');
  const [selectedTemplateHeaderMediaType, setSelectedTemplateHeaderMediaType] = useState<string>('');
  const [selectedTemplateHeaderMediaUrl, setSelectedTemplateHeaderMediaUrl] = useState<string>('');
  const [selectedTemplateFooterText, setSelectedTemplateFooterText] = useState<string>('');
  const [selectedTemplateButtons, setSelectedTemplateButtons] = useState<Array<{type: string; text: string}>>([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [selectedTemplateLanguage, setSelectedTemplateLanguage] = useState<string>('pt_BR');
  const [selectedMetaConnectionId, setSelectedMetaConnectionId] = useState<string>('');

  const { instances } = useWhatsAppInstances();
  const { createCampaign, startCampaign } = useBroadcasts();
  const { contacts: allContacts, lists } = useContacts();
  const { profiles } = useDispatchProfiles();
  const voiceProfiles: any[] = [];
  const { data: flows = [] } = useFlows();
  const activeFlows = flows.filter(f => f.status === 'active' || f.status === 'draft');
  const connectedInstances = instances.filter(i => i.status === 'connected');

  // Fetch meta_templates (WhatsApp templates created in the system)
  const { data: metaTemplates = [] } = useQuery({
    queryKey: ['meta-templates-campaign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleCsvParsed = useCallback((h: string[], r: string[][]) => { setHeaders(h); setRows(r); }, []);

  // Steps depend on source type
  const getSteps = () => {
    if (sourceType === 'csv') return ['Origem', 'Upload CSV', 'Mapear Colunas', 'Mensagem', 'Configurar e Enviar'];
    if (sourceType === 'contacts') return ['Origem', 'Selecionar Contatos', 'Mensagem', 'Configurar e Enviar'];
    return ['Origem'];
  };
  const STEPS = getSteps();

  // Get selected contacts for contacts source
  const getSelectedContacts = (): Contact[] => {
    const fromLists = allContacts.filter(c => (c.list_ids || []).some(lid => selectedListIds.includes(lid)));
    const fromIndividual = allContacts.filter(c => selectedContactIds.includes(c.id));
    const map = new Map<string, Contact>();
    [...fromLists, ...fromIndividual].forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  };

  const filteredContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch) ||
    c.company.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const toggleList = (listId: string) => {
    setSelectedListIds(prev => prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]);
  };

  const selectAllFiltered = () => {
    const ids = filteredContacts.map(c => c.id);
    setSelectedContactIds(prev => {
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  // Build recipients from either source
  const buildRecipients = () => {
    if (sourceType === 'csv') {
      const phoneIdx = headers.indexOf(mapping.phone || '');
      if (phoneIdx < 0) return [];
      return rows.map(row => {
        const variables: Record<string, any> = {};
        for (const [templateVar, csvColumn] of Object.entries(variableMapping)) {
          const idx = headers.indexOf(csvColumn);
          if (idx >= 0) variables[templateVar] = row[idx];
        }
        for (const [field, column] of Object.entries(mapping)) {
          if (field === 'phone') continue;
          if (variables[field]) continue;
          const idx = headers.indexOf(column);
          if (idx >= 0) variables[field] = row[idx];
        }
        const raw = row[phoneIdx] || '';
        const normalized = normalizeBrazilianPhone(raw);
        return { phone_number: normalized || raw.replace(/\D/g, ''), variables };
      }).filter(r => r.phone_number.length >= 10);
    } else {
      const selected = getSelectedContacts();
      const contactFieldMap: Record<string, (c: Contact) => string> = {
        nome: c => c.name,
        empresa: c => c.company || '',
        cidade: c => c.city || '',
      };
      return selected.map(c => {
        const variables: Record<string, any> = {};
        for (const [templateVar, contactField] of Object.entries(variableMapping)) {
          const getter = contactFieldMap[contactField];
          variables[templateVar] = getter ? getter(c) : contactField;
        }
        return {
          phone_number: normalizeBrazilianPhone(c.phone) || c.phone.replace(/\D/g, ''),
          variables,
        };
      }).filter(r => r.phone_number.length >= 10);
    }
  };

  const getPreviewData = (): Record<string, any> | null => {
    if (sourceType === 'contacts') {
      const selected = getSelectedContacts();
      if (selected.length) return { nome: selected[0].name, empresa: selected[0].company, cidade: selected[0].city };
      return null;
    }
    if (!rows.length || !headers.length) return null;
    const preview: Record<string, any> = {};
    for (const [field, column] of Object.entries(mapping)) {
      if (field === 'phone') continue;
      const idx = headers.indexOf(column);
      if (idx >= 0) preview[field] = rows[0][idx];
    }
    return preview;
  };

  const canAdvance = () => {
    if (step === 0) return !!sourceType;
    if (sourceType === 'csv') {
      if (step === 1) return headers.length > 0 && rows.length > 0;
      if (step === 2) return !!mapping.phone;
      if (step === 3) return template.trim().length > 0;
      if (step === 4) return !!campaignName.trim();
    } else {
      if (step === 1) return getSelectedContacts().length > 0;
      if (step === 2) return template.trim().length > 0;
      if (step === 3) return !!campaignName.trim();
    }
    return false;
  };

  const addCustomField = () => {
    const name = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name || customFields.includes(name)) return;
    setCustomFields([...customFields, name]);
    setNewFieldName('');
  };

  const handleSubmit = async () => {
    const recipients = buildRecipients();
    if (!recipients.length) return;

    const effectiveCustomFields = sourceType === 'contacts' ? ['nome', 'empresa', 'cidade'] : customFields;
    const effectiveMapping = sourceType === 'contacts' ? { phone: 'phone', nome: 'nome', empresa: 'empresa', cidade: 'cidade' } : mapping;

    const effectiveInstanceId = rotationStrategy === 'single' ? instanceId : selectedInstanceIds[0] || '';

    const input: CreateCampaignInput = {
      name: campaignName, message_template: template, message_type: selectedMessageType,
      media_url: selectedMediaUrls.length > 0 ? selectedMediaUrls[0] : undefined,
      media_urls: selectedMediaUrls,
      media_rotation_mode: selectedMediaRotationMode,
      instance_id: effectiveInstanceId || undefined,
      delay_min_ms: delayMin * 1000, delay_max_ms: delayMax * 1000,
      batch_size: batchSize, delay_between_batches: delayBetweenBatches * 60, delay_between_batches_max: delayBetweenBatchesMax * 60,
      column_mapping: effectiveMapping, custom_fields: effectiveCustomFields, recipients,
      rotation_strategy: rotationStrategy,
      instance_ids: rotationStrategy !== 'single' ? selectedInstanceIds : [],
      voice_profile_id: selectedMessageType === 'audio' && selectedVoiceProfileId ? selectedVoiceProfileId : undefined,
      flow_id: selectedFlowId || undefined,
      template_name: selectedMessageType === 'template' ? selectedTemplateName : undefined,
      template_language: selectedMessageType === 'template' ? selectedTemplateLanguage : undefined,
      template_header_media: selectedMessageType === 'template' && selectedTemplateHeaderMediaType ? { type: selectedTemplateHeaderMediaType, url: selectedTemplateHeaderMediaUrl } : undefined,
      meta_connection_id: selectedMessageType === 'template' ? selectedMetaConnectionId : undefined,
    };
    try {
      const campaign = await createCampaign.mutateAsync(input);
      const hasConnection = effectiveInstanceId || selectedInstanceIds.length > 0 || selectedMetaConnectionId;
      if (hasConnection) await startCampaign.mutateAsync(campaign.id);
      onCampaignCreated(campaign);
    } catch {}
  };

  const isSubmitting = createCampaign.isPending || startCampaign.isPending;
  const [savingDraft, setSavingDraft] = useState(false);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const draftName = campaignName.trim() || `Rascunho ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
      const effectiveInstanceId = rotationStrategy === 'single' ? instanceId : selectedInstanceIds[0] || '';

      if (editingCampaign) {
        const { error } = await supabase.from('broadcast_campaigns').update({
          name: draftName,
          message_template: template || '',
          message_type: selectedMessageType,
          instance_id: effectiveInstanceId || null,
          instance_ids: rotationStrategy !== 'single' ? selectedInstanceIds : [],
          delay_min_ms: delayMin * 1000,
          delay_max_ms: delayMax * 1000,
          batch_size: batchSize,
          delay_between_batches: delayBetweenBatches * 60,
          delay_between_batches_max: delayBetweenBatchesMax * 60,
          rotation_strategy: rotationStrategy,
          voice_profile_id: selectedVoiceProfileId || null,
          flow_id: selectedFlowId || null,
          column_mapping: mapping,
          custom_fields: customFields,
        } as any).eq('id', editingCampaign.id);
        if (error) throw error;
        toast.success('Rascunho atualizado!');
      } else {
        const { error } = await supabase.from('broadcast_campaigns').insert({
          name: draftName,
          message_template: template || '',
          message_type: selectedMessageType,
          user_id: '00000000-0000-0000-0000-000000000000',
          status: 'draft',
          instance_id: effectiveInstanceId || null,
          instance_ids: rotationStrategy !== 'single' ? selectedInstanceIds : [],
          delay_min_ms: delayMin * 1000,
          delay_max_ms: delayMax * 1000,
          batch_size: batchSize,
          delay_between_batches: delayBetweenBatches * 60,
          delay_between_batches_max: delayBetweenBatchesMax * 60,
          rotation_strategy: rotationStrategy,
          voice_profile_id: selectedVoiceProfileId || null,
          flow_id: selectedFlowId || null,
          column_mapping: mapping,
          custom_fields: customFields,
          total_recipients: 0,
        } as any).select().single();
        if (error) throw error;
        toast.success('Rascunho salvo!');
      }
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      onCampaignCreated({} as BroadcastCampaign);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  };
  const isLastStep = step === STEPS.length - 1;
  const recipients = isLastStep ? buildRecipients() : [];
  const selectedContacts = sourceType === 'contacts' ? getSelectedContacts() : [];

  // Determine which content to render based on step + sourceType
  const renderStepContent = () => {
    // Step 0: source selection (always)
    if (step === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Como deseja selecionar os destinatários?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setSourceType('contacts')}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary/50",
                sourceType === 'contacts' ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <Users className={cn("w-10 h-10", sourceType === 'contacts' ? "text-primary" : "text-muted-foreground")} />
              <div className="text-center">
                <p className="font-medium text-foreground">Contatos & Listas</p>
                <p className="text-xs text-muted-foreground mt-1">Selecione da sua base de contatos</p>
              </div>
              {allContacts.length > 0 && <span className="text-xs text-muted-foreground">{allContacts.length} contatos disponíveis</span>}
            </button>
            <button
              onClick={() => setSourceType('csv')}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-primary/50",
                sourceType === 'csv' ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <FileSpreadsheet className={cn("w-10 h-10", sourceType === 'csv' ? "text-primary" : "text-muted-foreground")} />
              <div className="text-center">
                <p className="font-medium text-foreground">Importar CSV</p>
                <p className="text-xs text-muted-foreground mt-1">Envie um arquivo com números</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    if (sourceType === 'csv') {
      if (step === 1) return <CsvUploader onDataParsed={handleCsvParsed} />;
      if (step === 2) return (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Telefone <span className="text-destructive">*</span></label>
            <Select value={mapping.phone || ''} onValueChange={val => setMapping({ ...mapping, phone: val })}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a coluna do telefone" /></SelectTrigger>
              <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Campos personalizados</label>
            {customFields.map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">{`{{${f}}}`}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <Select value={mapping[f] || ''} onValueChange={val => setMapping({ ...mapping, [f]: val })}>
                  <SelectTrigger className="flex-1 bg-background h-8 text-xs"><SelectValue placeholder="Coluna" /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex gap-2 items-center">
              <Input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Nome do campo" className="flex-1 bg-background h-8 text-xs" onKeyDown={e => e.key === 'Enter' && addCustomField()} />
              <button onClick={addCustomField} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md">Adicionar</button>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Preview (linha 1):</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {headers.map((h, i) => <React.Fragment key={h}><span className="text-muted-foreground">{h}:</span><span className="text-foreground truncate">{rows[0]?.[i] || '—'}</span></React.Fragment>)}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Contact selection step
    if (sourceType === 'contacts' && step === 1) {
      return (
        <div className="space-y-4">
          {lists.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Listas</label>
              <div className="flex flex-wrap gap-2">
                {lists.map(l => {
                  const count = allContacts.filter(c => (c.list_ids || []).includes(l.id)).length;
                  return (
                    <button key={l.id} onClick={() => toggleList(l.id)}
                      className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all", selectedListIds.includes(l.id) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50")}>
                      <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0", selectedListIds.includes(l.id) ? "bg-primary border-primary" : "border-border")}>
                        {selectedListIds.includes(l.id) && <Check className="w-2 h-2 text-primary-foreground" />}
                      </div>
                      {l.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Contatos individuais</label>
              <button onClick={selectAllFiltered} className="text-xs text-primary hover:underline">Selecionar tudo</button>
            </div>
            <Input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Buscar contato..." className="bg-background h-8 text-xs" />
            <div className="max-h-56 overflow-y-auto space-y-0.5 border border-border rounded-lg p-1">
              {filteredContacts.map(c => (
                <button key={c.id} onClick={() => toggleContact(c.id)}
                  className={cn("flex items-center gap-2 w-full p-2 rounded text-left text-xs transition-colors", selectedContactIds.includes(c.id) ? "bg-primary/5" : "hover:bg-muted/50")}>
                  <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0", selectedContactIds.includes(c.id) ? "bg-primary border-primary" : "border-border")}>
                    {selectedContactIds.includes(c.id) && <Check className="w-2 h-2 text-primary-foreground" />}
                  </div>
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="text-muted-foreground font-mono">{c.phone}</span>
                  {c.company && <span className="text-muted-foreground">· {c.company}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-sm text-foreground font-medium">{selectedContacts.length} contatos selecionados</p>
          </div>
        </div>
      );
    }

    // Message step (same for both sources)
    const messageStepIdx = sourceType === 'csv' ? 3 : 2;
    if (step === messageStepIdx) {
      const availableFields = sourceType === 'contacts' ? ['nome', 'empresa', 'cidade'] : customFields;


      // Helper to extract body text from meta_template components
      const getMetaTemplateBody = (components: any): string => {
        if (!Array.isArray(components)) return '';
        const bodyComp = components.find((c: any) => c.type === 'BODY');
        return bodyComp?.text || '';
      };

      const handleSelectMetaTemplate = (mt: any) => {
        const components = Array.isArray(mt.components) ? mt.components : [];
        const bodyText = getMetaTemplateBody(mt.components);
        setTemplate(bodyText);
        setSelectedMessageType('template');
        setSelectedMediaUrls([]);
        setSelectedTemplateName(mt.name);
        setSelectedTemplateLanguage(mt.language || 'pt_BR');
        setSelectedMetaConnectionId(mt.meta_connection_id || '');

        // Extract header
        const headerComp = components.find((c: any) => c.type === 'HEADER');
        if (headerComp) {
          const fmt = headerComp.format || 'TEXT';
          if (fmt === 'TEXT') {
            setSelectedTemplateHeaderText(headerComp.text || '');
            setSelectedTemplateHeaderMediaType('');
          } else {
            setSelectedTemplateHeaderText('');
            setSelectedTemplateHeaderMediaType(fmt);
            // O vídeo/imagem do template fica em mediaUrl (header_handle é só o código interno da Meta)
            setSelectedTemplateHeaderMediaUrl(headerComp.mediaUrl || '');
          }
        } else {
          setSelectedTemplateHeaderText('');
          setSelectedTemplateHeaderMediaType('');
          setSelectedTemplateHeaderMediaUrl('');
        }

        // Extract footer
        const footerComp = components.find((c: any) => c.type === 'FOOTER');
        setSelectedTemplateFooterText(footerComp?.text || '');

        // Extract buttons
        const buttonsComp = components.find((c: any) => c.type === 'BUTTONS');
        setSelectedTemplateButtons(
          buttonsComp?.buttons?.map((b: any) => ({ type: b.type, text: b.text || '' })) || []
        );

        const vars = Array.from(new Set(
          (bodyText.match(/\{\{([^}]+)\}\}/g) || []).map((m: string) => m.replace(/\{\{|\}\}/g, ''))
        ));
        const autoMap: Record<string, string> = {};
        for (const v of vars) {
          const match = availableFields.find(f => f.toLowerCase() === v.toLowerCase());
          if (match) autoMap[v] = match;
        }
        setVariableMapping(autoMap);
      };

      // Extract {{variables}} from the selected template
      const templateVars = Array.from(new Set(
        (template.match(/\{\{([^}]+)\}\}/g) || []).map(m => m.replace(/\{\{|\}\}/g, ''))
      ));

      // Build preview variable values from mapping
      const previewVarValues: Record<string, string> = {};
      for (const v of templateVars) {
        const mappedField = variableMapping[v];
        if (mappedField) {
          if (sourceType === 'contacts') {
            const selected = getSelectedContacts();
            if (selected.length > 0) {
              const fieldMap: Record<string, string> = { nome: selected[0].name, empresa: selected[0].company || '', cidade: selected[0].city || '' };
              previewVarValues[v] = fieldMap[mappedField] || mappedField;
            } else {
              previewVarValues[v] = mappedField;
            }
          } else if (rows.length > 0) {
            const colIdx = headers.indexOf(mappedField);
            previewVarValues[v] = colIdx >= 0 ? (rows[0][colIdx] || mappedField) : mappedField;
          }
        }
      }

      return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* Template selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Selecionar template</label>
                <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/50">
                  <button
                    type="button"
                    onClick={() => setTemplateViewMode('grid')}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      templateViewMode === 'grid' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Grade"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateViewMode('list')}
                    className={cn(
                      "p-1.5 rounded transition-all",
                      templateViewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {metaTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum template WhatsApp disponível</p>
              ) : templateViewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {metaTemplates.map(mt => {
                    const bodyText = getMetaTemplateBody(mt.components);
                    const isSelected = template === bodyText && bodyText.length > 0;
                    return (
                      <button
                        key={mt.id}
                        type="button"
                        onClick={() => handleSelectMetaTemplate(mt)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="text-sm font-medium text-foreground truncate">{mt.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{mt.status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{mt.category}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{bodyText || 'Sem corpo'}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {metaTemplates.map(mt => {
                    const bodyText = getMetaTemplateBody(mt.components);
                    const isSelected = template === bodyText && bodyText.length > 0;
                    return (
                      <button
                        key={mt.id}
                        type="button"
                        onClick={() => handleSelectMetaTemplate(mt)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{mt.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{bodyText || 'Sem corpo'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{mt.status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{mt.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Variable mapping */}
            {template && templateVars.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <label className="text-sm font-semibold text-foreground">Vincular variáveis</label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Relacione cada variável do template com um campo {sourceType === 'contacts' ? 'do contato' : 'do CSV'}.
                </p>
                <div className="space-y-2">
                  {templateVars.map(v => (
                    <div key={v} className="flex items-center gap-3">
                      <div className="min-w-[120px] px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs font-mono text-primary shrink-0">
                        {`{{${v}}}`}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={variableMapping[v] || ''}
                        onValueChange={val => setVariableMapping(prev => ({ ...prev, [v]: val }))}
                      >
                        <SelectTrigger className="flex-1 bg-background h-9 text-xs">
                          <SelectValue placeholder="Selecione o campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                          {sourceType === 'csv' && headers.filter(h => !availableFields.includes(h)).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {variableMapping[v] && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                {templateVars.some(v => !variableMapping[v]) && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Variáveis não vinculadas serão exibidas como texto literal.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Phone Preview */}
          <div className="lg:col-span-2">
            <WhatsAppPhonePreview
              content={template || "Selecione um template para visualizar..."}
              messageType={selectedMessageType}
              mediaUrl={selectedMediaUrls.length > 0 ? selectedMediaUrls[0] : undefined}
              variableValues={previewVarValues}
              templateHeaderText={selectedTemplateHeaderText}
              templateHeaderMediaType={selectedTemplateHeaderMediaType}
              templateHeaderMediaUrl={selectedTemplateHeaderMediaUrl}
              templateFooterText={selectedTemplateFooterText}
              templateButtons={selectedTemplateButtons}
            />
          </div>
        </div>
      );
    }

    // Config step (last step for both)
    if (isLastStep) {
      const toggleInstanceSelection = (id: string) => {
        setSelectedInstanceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      };

      const getProfileColor = (delayMinS: number) => {
        if (delayMinS >= 40) return "text-green-500";
        if (delayMinS >= 20) return "text-yellow-500";
        return "text-red-500";
      };

      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nome da campanha <span className="text-destructive">*</span></label>
            <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Promoção Janeiro" className="bg-background" />
          </div>

          {/* Instance selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Instância WhatsApp</label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione a instância" /></SelectTrigger>
              <SelectContent>{connectedInstances.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''}</SelectItem>)}</SelectContent>
            </Select>
            {!connectedInstances.length && <p className="text-xs text-destructive">Nenhuma instância conectada.</p>}
          </div>

          {/* Voice Profile selector for audio campaigns */}
          {selectedMessageType === 'audio' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Perfil de voz (TTS)</label>
              {voiceProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum perfil de voz disponível — crie em Perfis de Voz</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {voiceProfiles.map(vp => (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setSelectedVoiceProfileId(vp.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        selectedVoiceProfileId === vp.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Mic className={cn("w-4 h-4", selectedVoiceProfileId === vp.id ? "text-primary" : "text-muted-foreground")} />
                        <p className="text-sm font-medium text-foreground">{vp.name}</p>
                        {vp.is_default && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Padrão</Badge>}
                      </div>
                      {vp.description && <p className="text-[11px] text-muted-foreground mt-1">{vp.description}</p>}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Modelo: {vp.elevenlabs_model} · Vel: {vp.speed}x
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flow linkage */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              Fluxo de follow-up (opcional)
            </label>
            <p className="text-xs text-muted-foreground">Quando o lead responder, será direcionado automaticamente para este fluxo</p>
            <Select value={selectedFlowId || "none"} onValueChange={(v) => setSelectedFlowId(v === "none" ? "" : v)}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Nenhum fluxo vinculado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {activeFlows.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} <span className="text-muted-foreground">({f.status === 'active' ? 'Ativo' : 'Rascunho'})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 bg-secondary/50 border border-border rounded-xl space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Resumo</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Instância:</span><span className="text-foreground font-medium">{connectedInstances.find(i => i.id === instanceId)?.name || '—'}</span>
              <span className="text-muted-foreground">Fonte:</span><span className="text-foreground font-medium">{sourceType === 'csv' ? 'CSV' : 'Contatos'}</span>
              {selectedFlowId && <>
                <span className="text-muted-foreground">Fluxo:</span>
                <span className="text-foreground font-medium">{activeFlows.find(f => f.id === selectedFlowId)?.name || '—'}</span>
              </>}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={step === 0 ? onClose : () => setStep(step - 1)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
          <div><h2 className="text-lg font-bold text-foreground">Nova Campanha</h2><p className="text-xs text-muted-foreground">Passo {step + 1} de {STEPS.length}</p></div>
        </div>
      </div>

      <div className="flex items-center gap-1 px-6 py-3 border-b border-border/50">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-border">
      <div className="flex items-center gap-2">
          <button onClick={step === 0 ? onClose : () => setStep(step - 1)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">{step === 0 ? 'Cancelar' : 'Voltar'}</button>
          {step > 0 && (
            <button onClick={handleSaveDraft} disabled={savingDraft} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50">
              {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Salvar Rascunho
            </button>
          )}
        </div>
        {!isLastStep ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">Próximo<ArrowRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={handleSubmit} disabled={!canAdvance() || isSubmitting} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <><Send className="w-4 h-4" />Disparar</>}
          </button>
        )}
      </div>
    </div>
  );
};

export default CampaignWizard;

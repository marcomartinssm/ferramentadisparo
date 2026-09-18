import { useTemplateWizard, type TemplateCategory, type TemplateType, type ParameterFormat } from '@/hooks/useTemplateWizard';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, X, Phone, CheckCircle } from 'lucide-react';
import { META_LANGUAGES } from '@/lib/metaLanguages';
import { useState, useEffect } from 'react';

interface MetaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string | null;
}

export function StepBasicInfo() {
  const { state, dispatch } = useTemplateWizard();
  const [showUsaAlert, setShowUsaAlert] = useState(true);
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);

  useEffect(() => {
    supabase
      .from('meta_connections')
      .select('id, waba_id, phone_number_id')
      .eq('is_active', true)
      .then(({ data }) => {
        setConnections(data || []);
        if (data && data.length === 1 && !state.metaConnectionId) {
          dispatch({ type: 'SET_FIELD', field: 'metaConnectionId', value: data[0].id });
        }
        setLoadingConns(false);
      });
  }, []);

  const handleNameChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);
    dispatch({ type: 'SET_FIELD', field: 'name', value: formatted });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {state.category === 'MARKETING' && showUsaAlert && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-warning">Marketing pausado para EUA</p>
            <p className="text-muted-foreground text-xs mt-1">
              Desde abril de 2025, templates de Marketing estão temporariamente pausados para números dos EUA (+1).
            </p>
          </div>
          <button onClick={() => setShowUsaAlert(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Meta Connection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" /> Conta WhatsApp
        </Label>
        {loadingConns ? (
          <p className="text-xs text-muted-foreground">Carregando contas...</p>
        ) : connections.length === 0 ? (
          <p className="text-xs text-warning">Nenhuma conta Meta conectada. Conecte uma conta em Configurações.</p>
        ) : (
          <Select
            value={state.metaConnectionId || ''}
            onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'metaConnectionId', value: v })}
          >
            <SelectTrigger><SelectValue placeholder="Selecione uma conta" /></SelectTrigger>
            <SelectContent>
              {connections.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  WABA {c.waba_id} {c.phone_number_id ? `· ${c.phone_number_id}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>Nome do template</Label>
        <Input
          value={state.name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="ex: confirmacao_pedido_v2"
          className="font-mono text-sm"
          disabled={state.isEditing}
        />
        {state.isEditing && (
          <p className="text-xs text-muted-foreground">O nome não pode ser alterado após a criação.</p>
        )}
        <p className="text-xs text-muted-foreground">{state.name.length}/512 — apenas minúsculas, números e _</p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select
          value={state.category}
          onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'category', value: v as TemplateCategory })}
          disabled={state.isEditing}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MARKETING">Marketing — Promoções e ofertas</SelectItem>
            <SelectItem value="UTILITY">Utility — Transacional e operacional</SelectItem>
            <SelectItem value="AUTHENTICATION">Authentication — Códigos OTP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label>Idioma</Label>
        <Select value={state.language} onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'language', value: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {META_LANGUAGES.map(l => (
              <SelectItem key={l.code} value={l.code}>{l.name} ({l.code})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Parameter format */}
      {state.category !== 'AUTHENTICATION' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Formato de variáveis
            <Badge variant="outline" className="text-[10px]">v24.0+</Badge>
          </Label>
          <RadioGroup
            value={state.parameterFormat}
            onValueChange={v => dispatch({ type: 'SET_FIELD', field: 'parameterFormat', value: v as ParameterFormat })}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="POSITIONAL" id="pos" />
              <Label htmlFor="pos" className="font-normal text-sm cursor-pointer">{'Posicional — {{1}}, {{2}}'}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="NAMED" id="named" />
              <Label htmlFor="named" className="font-normal text-sm cursor-pointer">{'Nomeado — {{nome}}, {{pedido_id}}'}</Label>
            </div>
          </RadioGroup>
        </div>
      )}

    </div>
  );
}

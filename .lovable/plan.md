

## Plano: Atualizar Central de Ajuda

### Situação atual
A Central de Ajuda tem 7 guias que cobrem todas as seções ativas do menu:
- Dashboard, Campanhas, Contatos, Importação CSV, Templates, Fluxos, Canais de WhatsApp

As funcionalidades removidas (Settings, Pipeline, Analytics, Scraping, Teste A/B) já foram retiradas dos guias. Os guias existentes estão geralmente precisos.

### Atualizações necessárias

1. **`dashboard-guide.ts`** — Atualizar abas para refletir que "Campanhas", "Gatilhos" e "Fluxos" não existem (remover referências a "em breve")

2. **`campaigns-guide.ts`** — Atualizar para refletir:
   - Tipo de campanha é "WhatsApp API Oficial" (não "WhatsApp Web")
   - Menção a templates Meta no passo de mensagem
   - Perfis de disparo no passo de velocidade
   - Remover referência a "Áudio TTS" (ElevenLabs foi removido)

3. **`templates-guide.ts`** — Adicionar menção à sincronização automática de status e ao score de validação com mais detalhes

4. **`flows-guide.ts`** — Verificar se reflete os tipos de nodes atuais (mensagem com dropdown de templates, etc.)

5. **`contacts-guide.ts`** — Pequenos ajustes de consistência

6. **`instances-guide.ts`** — Está atualizado, sem mudanças necessárias

7. **`csv-import-guide.ts`** — Está atualizado, sem mudanças necessárias

### Arquivos editados
- `src/data/help/dashboard-guide.ts`
- `src/data/help/campaigns-guide.ts`
- `src/data/help/templates-guide.ts`
- `src/data/help/flows-guide.ts`
- `src/data/help/contacts-guide.ts`


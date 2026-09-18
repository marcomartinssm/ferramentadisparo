Registro de funcionalidades removidas e motivos

- **Perfis de Voz / ElevenLabs**: removido a pedido do usuário (tela, settings tab, componente ElevenLabsSettings, edge function test-elevenlabs-tts)
- **Geração de Listas (Scraping)**: removido a pedido do usuário (página Scraping, hooks useScrapingJobs/useLeadSearches, componentes scraping/*, edge functions scraping-execute, lead-search-execute, lead-search-ai-chat, lead-enrich-ai, sidebar item)
- **Tela Agentes (Convivência de Agentes)**: removido a pedido do usuário. Página /agents deletada, rota e sidebar item removidos.
- **Agente de IA (Follow-up)**: removido a pedido do usuário. Página /followup, hooks useFollowup, componentes followup/*, edge functions followup-ai-chat/followup-enroller/followup-processor, guia agent-guide deletados.
- **Bate-papo (Chat)**: removido a pedido do usuário. Página /chat, hook useConversations, guia chat-guide deletados. Tabela conversation_messages mantida para uso nos fluxos.
- **Nodes de Fluxo (IA, Ação, Switch, Condição)**: removidos a pedido do usuário. Fluxo simplificado para apenas Mensagem e Intervalo. Backend mantém suporte para fluxos antigos.
- **Configurações**: removido a pedido do usuário (página SettingsPage.tsx, rota /settings, sidebar item, guia settings-guide)

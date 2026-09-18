export const campaignsGuide = `# Campanhas

A tela de Campanhas é o centro de controle para disparos em massa via WhatsApp. Aqui você cria, gerencia e monitora todas as suas campanhas.

---

## 1. Visão Geral

A tela exibe uma tabela com todas as campanhas, mostrando:

- **Nome** da campanha
- **Tipo** (API Oficial WhatsApp)
- **Data de criação** e **Data de início**
- **Status** (Executando, Pausada, Finalizado, Rascunho, Cancelado, Em Espera, Agendado)

---

## 2. Filtros por Status

Use as abas na parte superior para filtrar campanhas:

| Aba | Mostra |
|---|---|
| **Todos** | Todas as campanhas |
| **Executando** | Campanhas em andamento |
| **Pausadas** | Temporariamente suspensas |
| **Cancelado** | Campanhas com falha |
| **Finalizadas** | Envio completo |
| **Em Espera** | Aguardando próximo lote |
| **Agendado** | Agendadas para o futuro |
| **Rascunho** | Ainda não enviadas |

Cada aba mostra a contagem entre parênteses. Há também uma barra de busca por nome.

---

## 3. Criando uma Campanha (Wizard)

Clique em **"Nova Campanha"** para abrir o assistente de criação. O processo tem os seguintes passos:

### Passo 1 — Fonte dos contatos

Escolha a origem dos destinatários:

- **Contatos existentes** — Selecione listas ou contatos individuais da sua base
- **Arquivo CSV** — Faça upload de um CSV com os números e variáveis

### Passo 2 — Configuração de instâncias

- **Instância única** — Selecione um número de WhatsApp conectado
- **Múltiplas instâncias (rotação)** — Selecione vários números e o sistema distribui os envios entre eles automaticamente

### Passo 3 — Mensagem

Configure o conteúdo a ser enviado:

- **Texto simples** — Escreva a mensagem diretamente com suporte a \`{{variáveis}}\`
- **Template Meta** — Selecione um template aprovado pela Meta para envio via API Oficial
- **Mídia** — Anexe imagens, vídeos ou documentos

Você pode usar **variáveis dinâmicas** como \`{{nome}}\`, \`{{empresa}}\` etc., que serão substituídas pelos dados de cada contato.

### Passo 4 — Velocidade e lotes

Configure o ritmo de envio:

- **Delay entre mensagens** — Tempo mínimo e máximo entre cada envio (em segundos)
- **Tamanho do lote** — Quantas mensagens por lote
- **Pausa entre lotes** — Tempo de espera entre um lote e outro (em minutos)
- **Perfil de disparo** — Selecione um perfil pré-configurado (criado na tela Disparos) com velocidades otimizadas

### Passo 5 — Revisão e envio

Veja um resumo completo da campanha antes de confirmar. Você pode:

- **Enviar agora** — Inicia imediatamente
- **Salvar como rascunho** — Salva para enviar depois

---

## 4. Ações da Campanha

No menu de cada campanha (ícone ⋮), você pode:

| Ação | Descrição |
|---|---|
| **Visualizar** | Ver detalhes e progresso |
| **Estatísticas** | Acompanhar métricas de envio |
| **Duplicar** | Criar uma cópia da campanha |
| **Continuar edição** | Retomar um rascunho (apenas rascunhos) |
| **Remover** | Excluir permanentemente a campanha |

---

## 5. Detalhes da Campanha

Ao clicar em uma campanha, você vê:

- Progresso em tempo real (enviadas / total)
- Lista de destinatários com status individual (enviado, falha, pendente)
- Mensagem de erro para falhas individuais
- Horário de envio de cada mensagem

---

## Dicas

- Configure delays mais longos para evitar bloqueios do WhatsApp
- Use rotação de instâncias para distribuir a carga
- Salve como rascunho se precisar revisar antes de enviar
- A paginação mostra 10 campanhas por página
`;

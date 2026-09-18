export const flowsGuide = `# Guia do Usuário: Construtor de Fluxos

O Construtor de Fluxos é uma ferramenta visual para criar automações de conversas no WhatsApp. Pense nele como um mapa: você desenha o caminho que a conversa com o cliente vai seguir, passo a passo.

---

## 1. Criando um Fluxo

Na tela **Fluxos**, clique em **"Novo Fluxo"**. Você preenche:

- **Nome** — Ex: "Follow-up pós-venda"
- **Descrição** (opcional) — Para lembrar o objetivo
- **Gatilho de ativação** — O que inicia o fluxo:
  - **Manual** — Você ativa manualmente
  - **Pós-disparo** — Ativa quando um lead responde a uma campanha
  - **Resposta recebida** — Ativa ao receber qualquer mensagem
  - **Palavra-chave** — Ativa quando a mensagem contém uma palavra específica

Após criar, você é levado ao editor visual.

---

## 2. O Editor Visual (Canvas)

O editor é uma área ampla onde você monta o fluxo arrastando e conectando "cards" (blocos). Já vem com um card **"Início"** que não pode ser removido.

**Controles do canvas:**

- Arrastar o fundo para navegar pelo fluxo
- Scroll para dar zoom
- Controles de zoom no canto (botões +, -, tela cheia, cadeado)
- MiniMapa no canto mostra uma visão geral
- \`Ctrl+Z\` / \`Ctrl+Y\` para desfazer/refazer

---

## 3. Os Tipos de Cards (Blocos)

Na barra inferior do editor, você encontra **2 tipos de cards** para adicionar:

### 📨 Mensagem (azul)

Envia uma mensagem ao contato. Você configura:

- **Tipo de conteúdo:** Texto, Imagem, Áudio, Vídeo ou Documento
- **Conteúdo da mensagem:** Suporta \`{{variáveis}}\` e \`{spintax|opções}\`
- **URL da mídia** (para imagem/áudio/vídeo/documento)
- **Aguardar resposta:** Se ativado, o fluxo pausa e espera o contato responder. Se não responder dentro do timeout (em horas), segue pela saída "timeout"

### ⏱️ Intervalo (amarelo)

Cria uma pausa antes do próximo passo:

- **Duração e Unidade** (minutos, horas, dias)
- **Modo:** Tempo fixo ou Aguardar resposta (com timeout)
- Tem duas saídas: **"respondeu"** e **"timeout"**

---

## 4. Conectando Cards

Para conectar dois cards, arraste do **ponto de saída** (bolinha na parte inferior) até o **ponto de entrada** (bolinha na parte superior) de outro card.

- O sistema **bloqueia conexões que criariam loops** (ciclos)
- Você pode **inserir um card no meio** de uma conexão existente clicando na linha entre dois cards
- **Clique direito** em uma conexão para excluí-la
- **Clique direito** em um card para copiar, duplicar ou renomear

---

## 5. Configurando um Card

Clique em qualquer card para abrir o **painel de configuração à direita**. Ali você ajusta todas as opções específicas daquele tipo de card. O painel também tem um botão para excluir o card (exceto o de Início).

---

## 6. Salvando e Ativando

- **Salvar:** Clique no botão "Salvar" no topo. Isso grava todo o layout e configurações.
- **Ativar/Desativar:** Use o botão "Ativar" para colocar o fluxo em produção. Quando ativo, ele responde automaticamente conforme o gatilho configurado.
- **Resetar:** O botão "Resetar" limpa todas as execuções anteriores, útil para fazer testes novamente do zero.

---

## 7. Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| \`Ctrl+Z\` | Desfazer |
| \`Ctrl+Y\` | Refazer |
| \`Ctrl+C\` | Copiar card(s) selecionado(s) |
| \`Ctrl+V\` | Colar card(s) copiado(s) |
| \`Delete\` / \`Backspace\` | Excluir card selecionado |

---

## 8. Modo de Teste (Gatilho)

No card de Início, se o gatilho for **"Mensagem recebida"** ou **"Palavra-chave"**, você pode ativar o **Modo de teste**. Isso faz com que o fluxo só responda a um número de telefone específico, perfeito para testar sem afetar clientes reais.

---

## Exemplo Prático

Imagine que você quer responder automaticamente quando alguém envia "preço":

1. No card **Início**, defina gatilho = "Palavra-chave", keyword = "preço"
2. Adicione um card **Mensagem** com: "Olá! Nosso plano custa R$ 99/mês. Posso te ajudar com mais alguma dúvida?"
3. Ative **Aguardar resposta** com timeout de 24h
4. Conecte a saída **"respondeu"** a outro card **Mensagem** de acompanhamento
5. Conecte a saída **"timeout"** a um card **Mensagem** de follow-up: "Vi que você se interessou pelo nosso plano. Posso ajudar?"
6. **Salve** e **Ative** o fluxo

Pronto! O sistema agora responde automaticamente.
`;

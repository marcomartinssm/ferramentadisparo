export const templatesGuide = `# Templates

A tela de Templates permite criar e gerenciar templates de mensagem para a API Oficial do WhatsApp (Meta). Templates são obrigatórios para iniciar conversas via API Oficial e precisam de aprovação da Meta.

---

## 1. Visão Geral

No topo, quatro cards mostram estatísticas:

| Card | Descrição |
|---|---|
| **Total** | Quantidade de templates criados |
| **Aprovados** | Templates prontos para uso |
| **Pendentes** | Aguardando aprovação da Meta |
| **Rejeitados** | Templates que não foram aprovados |

Abaixo, uma tabela lista todos os templates com nome, categoria, status, idioma, score de validação e data de criação.

---

## 2. Status dos Templates

| Status | Significado |
|---|---|
| **Rascunho** | Salvo localmente, ainda não enviado à Meta |
| **Pendente** | Enviado à Meta, aguardando aprovação |
| **Aprovado** ✅ | Pronto para uso em campanhas |
| **Rejeitado** ❌ | Reprovado pela Meta (necessita ajustes) |

O sistema sincroniza automaticamente o status junto à Meta a cada 30 segundos. Você recebe uma notificação em tempo real quando um template é aprovado ou rejeitado, sem precisar atualizar a página.

---

## 3. Categorias

| Categoria | Uso |
|---|---|
| **Marketing** | Promoções, ofertas, novidades |
| **Utilidade** | Confirmações, atualizações, lembretes |
| **Autenticação** | Códigos OTP e verificações |

---

## 4. Criando um Template (Wizard de 7 passos)

Clique em **"Novo Template"** para iniciar o assistente. Os passos variam conforme a categoria:

### Para Marketing e Utilidade (7 passos):

**Passo 1 — Informações Básicas**
- Nome do template (apenas letras minúsculas, números e underscores)
- Categoria (Marketing, Utilidade ou Autenticação)
- Idioma (português, inglês, espanhol etc.)
- Tipo (Padrão, Carrossel ou Oferta por tempo limitado)
- Labels para organização
- Conexão Meta (qual número enviar)

**Passo 2 — Header (Opcional)**
- Tipos: Texto, Imagem, Vídeo, Documento ou Localização
- Suporta variáveis no texto: \`{{1}}\`

**Passo 3 — Corpo (Obrigatório)**
- Mensagem principal do template
- Suporta variáveis: \`{{1}}\`, \`{{2}}\` etc.
- Formatação: negrito, itálico, tachado, monospace

**Passo 4 — Footer (Opcional)**
- Texto de rodapé (sem variáveis)
- Limite de 60 caracteres

**Passo 5 — Botões (Opcional)**
- **Resposta rápida** — Botão com texto fixo
- **URL** — Link para site (pode ter variável)
- **Telefone** — Número para ligação
- **Copiar código** — Copia texto para área de transferência

**Passo 6 — Amostras**
- Valores de exemplo para cada variável
- Obrigatório para aprovação da Meta

**Passo 7 — Revisão**
- Validação completa do template
- Score de qualidade
- Botão para enviar à Meta ou salvar como rascunho

### Para Autenticação (5 passos):

Os passos são simplificados: Informações Básicas → Corpo (OTP) → Botão OTP → Amostras → Revisão.

---

## 5. Preview em Tempo Real

Durante todo o processo de criação, um preview do WhatsApp é exibido ao lado direito, mostrando exatamente como a mensagem vai aparecer no celular do destinatário.

---

## 6. Ações

| Ação | Descrição |
|---|---|
| **Editar** | Modificar qualquer template |
| **Continuar edição** | Retomar um rascunho |
| **Deletar** | Remover template permanentemente |
| **Salvar rascunho** | Salvar sem enviar à Meta |

---

## 7. Score de Validação

Cada template recebe um score de 0 a 100 que avalia a qualidade antes do envio à Meta. O score considera:

- Presença de palavras spam ou promocionais em excesso
- Uso correto de variáveis
- Comprimento adequado do texto
- Boas práticas de formatação

Templates com score alto têm maior chance de aprovação.

---

## Dicas

- Nomes de template não podem conter espaços ou caracteres especiais
- Templates rejeitados podem ser editados e reenviados
- Use o score de validação para otimizar suas chances de aprovação
- O preview ao vivo ajuda a garantir que a mensagem ficará como esperado
- A sincronização de status é automática — não é necessário verificar manualmente
`;

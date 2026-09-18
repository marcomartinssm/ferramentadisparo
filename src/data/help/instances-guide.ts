export const instancesGuide = `# Canais de WhatsApp

A tela de Canais de WhatsApp permite conectar e gerenciar seus números de WhatsApp para envio de mensagens via API Oficial Meta.

---

## 1. Visão Geral

A tela exibe todos os canais cadastrados em formato de cards, mostrando:

- **Nome** do canal
- **Número de telefone** associado
- **Provider** (API Oficial Meta)
- **Status** (Conectado / Desconectado)
- **Indicador de padrão** — Canal usado por default nos envios

---

## 2. Adicionando um Canal

Clique em **"Adicionar Canal"** e preencha:

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Nome** | ✅ Sim | Nome identificador (ex: "Número Principal") |
| **Número de telefone** | ✅ Sim | Número completo com DDI |
| **WABA ID** | ✅ Sim | ID da conta WhatsApp Business (encontrado no Meta Business) |
| **Phone Number ID** | ✅ Sim | ID do número de telefone na API Meta |
| **Access Token** | ✅ Sim | Token de acesso permanente do Meta |

### Onde encontrar esses dados

1. Acesse o [Meta Business Suite](https://business.facebook.com)
2. Vá em **Configurações do WhatsApp** → **API Setup**
3. Copie o **WABA ID**, **Phone Number ID** e gere um **Access Token permanente**

---

## 3. Status do Canal

| Status | Significado |
|---|---|
| 🟢 **Conectado** | Token válido, pronto para envios |
| 🔴 **Desconectado** | Token expirado ou inválido |

---

## 4. Configuração do Webhook (Receber Mensagens)

Para que o sistema **receba mensagens** dos contatos (respostas, novas conversas), é necessário configurar o webhook no painel da Meta.

### Passo a passo

1. Na tela de Canais, localize a seção **"Configuração do Webhook Meta"** no topo
2. Copie a **Callback URL** exibida
3. Copie o **Verify Token** exibido
4. No Meta App Dashboard:
   - Acesse **WhatsApp** → **Configuration** → **Callback URL**
   - Cole a **Callback URL** e o **Verify Token**
   - Clique em **Verify and Save**
5. Em **Webhook Fields**, marque o campo **messages** e clique em **Subscribe**

> ⚠️ **Importante:** Sem o webhook configurado, o sistema não receberá respostas dos contatos e os fluxos com gatilho "Mensagem recebida" ou "Resposta de campanha" não funcionarão.

---

## 5. Configurações do Canal

Clique no ícone de engrenagem (⚙️) para abrir as configurações:

- **Visualizar credenciais** — Ver WABA ID, Phone Number ID e Access Token (com opção de mostrar/ocultar)
- **Copiar Webhook URL** — URL para configurar no Meta Business para receber mensagens
- **Webhook habilitado** — Ativar/desativar recebimento de mensagens

---

## 6. Ações

| Ação | Descrição |
|---|---|
| **Definir como padrão** ⭐ | Canal usado automaticamente nos envios |
| **Configurações** ⚙️ | Abrir painel de configurações |
| **Remover** 🗑️ | Excluir o canal permanentemente |
| **Atualizar** 🔄 | Recarregar status de todos os canais |

---

## Dicas

- Sempre configure o webhook para que o sistema receba as respostas dos contatos
- Use nomes descritivos para identificar facilmente cada canal
- Defina um canal como padrão para agilizar a criação de campanhas
- Se um canal aparece como "Desconectado", verifique se o Access Token não expirou
- Mantenha o Access Token em segurança — ele dá acesso total ao envio de mensagens
`;

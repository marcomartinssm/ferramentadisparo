export const contactsGuide = `# Contatos

A tela de Contatos é onde você gerencia toda a sua base de leads e clientes. O layout é dividido em duas áreas: lista de contatos à esquerda e painel de detalhes à direita.

---

## 1. Visão Geral

No topo, você vê o total de contatos e o número de listas criadas. Use o botão **"Criar"** para adicionar um contato manualmente.

---

## 2. Listas de Contatos

No painel esquerdo, há abas para organizar contatos:

- **Geral** — Todos os contatos da base
- **Listas personalizadas** — Grupos criados por você (ex: "Leads Evento 2026")

Para criar uma lista, clique em **"Nova Lista"** e defina:

- **Nome** da lista
- **Origem** (Manual, Importação ou Misto)

---

## 3. Criar Contato Manual

Ao clicar em **"Criar"**, preencha:

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Nome** | ✅ Sim | Nome completo do contato |
| **Telefone** | ✅ Sim | Número com DDI (seletor de país integrado) |
| **Empresa** | Não | Nome da empresa |
| **Cidade** | Não | Cidade do contato |
| **Tags** | Não | Etiquetas separadas por vírgula |
| **Listas** | Não | Selecione as listas para associar |

---

## 4. Painel de Detalhes

Ao selecionar um contato na lista, o painel direito exibe:

- **Informações básicas** — Nome, telefone, empresa, cidade
- **Status** — Novo, Interessado, Respondeu, Convertido, Disparado
- **Score** — Pontuação do contato (0 a 100)
- **Tags** — Etiquetas coloridas para categorização
- **Campos customizados** — Dados extras importados via CSV
- **Listas** — Quais listas o contato pertence
- **Validação WhatsApp** — Se o número foi verificado como válido

Ações disponíveis no painel:

- **Editar** — Alterar qualquer campo do contato
- **Remover** — Excluir permanentemente o contato

---

## 5. Importar Contatos (CSV)

Clique em **"Importar"** para abrir o assistente de importação. Consulte o guia **"Importação de Contatos"** para detalhes completos sobre formatos, mapeamento de colunas e boas práticas.

---

## 6. Exportar Contatos

Clique em **"Exportar"** para baixar todos os contatos visíveis em formato CSV. O arquivo inclui: nome, telefone, empresa, cidade, status, score e tags.

---

## 7. Busca

Use a barra de busca para filtrar contatos por nome ou telefone em tempo real.

---

## Dicas

- O telefone é a chave única — dois contatos não podem ter o mesmo número
- Contatos sem nome recebem "Sem nome" automaticamente
- Use tags para segmentar contatos em campanhas
- O score pode ser usado para priorizar leads mais quentes
- Ao reimportar um CSV, contatos existentes são atualizados (não duplicados)
`;

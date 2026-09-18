export const csvImportGuide = `# Importação de Contatos via CSV

Guia completo para importar seus contatos usando arquivos CSV.

---

## 1. Formato do Arquivo

| Requisito | Detalhe |
|---|---|
| **Extensão** | \`.csv\` ou \`.txt\` |
| **Codificação** | UTF-8 (recomendado) |
| **Tamanho máximo** | 10 MB |
| **Delimitadores aceitos** | Vírgula \`,\` · Ponto-e-vírgula \`;\` · Tab · Pipe \`|\` |

> O sistema detecta automaticamente qual delimitador seu arquivo usa — não é necessário configurar nada.

---

## 2. Colunas Reconhecidas

A **única coluna obrigatória** é o telefone. As demais são opcionais.

| Campo | Obrigatório | Aliases reconhecidos automaticamente |
|---|---|---|
| **Telefone** | ✅ Sim | \`telefone\`, \`phone\`, \`whatsapp\`, \`celular\`, \`fone\`, \`tel\`, \`número\`, \`numero\` |
| **Nome** | Não | \`nome\`, \`name\`, \`contato\`, \`cliente\` |
| **Empresa** | Não | \`empresa\`, \`company\`, \`organização\`, \`organizacao\`, \`org\` |
| **Cidade** | Não | \`cidade\`, \`city\`, \`municipio\`, \`município\`, \`localidade\` |
| **Tags** | Não | \`tags\`, \`tag\`, \`etiqueta\`, \`label\` |
| **Status** | Não | \`status\`, \`situação\`, \`situacao\`, \`estado\` |

### Formato do telefone

- Pode conter parênteses, traços, espaços e "+" — tudo será removido automaticamente
- Exemplos válidos: \`+55 11 95821-7530\`, \`5511958217530\`, \`(11) 95821-7530\`

### Formato de tags

Se sua planilha tiver uma coluna de tags, separe múltiplas tags por **vírgula** ou **ponto-e-vírgula**:

\`\`\`
vip, cliente-premium
lead;quente
\`\`\`

---

## 3. Exemplo de Planilha

| telefone | nome | empresa | cidade | tags |
|---|---|---|---|---|
| +55 11 95821-7530 | Kaique Otavio | TechCorp | São Paulo | vip, lead |
| 5521998765432 | Ana Carolina | StartupXYZ | Rio de Janeiro | cliente |
| (16) 99313-6870 | Rafael Santos | | Ribeirão Preto | |

---

## 4. Passo a Passo da Importação

### Passo 1 — Enviar o arquivo
Clique em **"Importar"** na tela de Contatos e arraste seu arquivo CSV ou clique para selecioná-lo.

### Passo 2 — Mapeamento de colunas
O sistema tenta mapear automaticamente suas colunas com base nos nomes dos cabeçalhos. Você verá:

- **Mapeamento automático**: colunas com nomes conhecidos (ex: "telefone") são mapeadas instantaneamente
- **IA Auto-mapear**: clique no botão para a IA analisar amostras dos dados e sugerir o melhor mapeamento
- **Manual**: use os selects para ajustar qualquer coluna manualmente

### Passo 3 — Campos customizados
Colunas que não correspondem a nenhum campo padrão aparecem na seção **"Colunas não mapeadas"**. Ative o switch para salvá-las como campos customizados no contato.

### Passo 4 — Selecionar lista (opcional)
Escolha uma lista de contatos para associar os registros importados.

### Passo 5 — Importar
Clique em **"Importar N contatos"**. O sistema processa em lotes de 500 e faz **upsert** pelo número de telefone — contatos existentes são atualizados, não duplicados.

---

## 5. Dicas e Boas Práticas

- **Sem cabeçalho?** O sistema exige que a primeira linha contenha os nomes das colunas
- **Contatos duplicados?** O telefone é a chave única — ao reimportar, dados existentes são atualizados
- **Valores vazios?** Campos opcionais em branco são simplesmente ignorados
- **Nome ausente?** Contatos sem nome recebem automaticamente "Sem nome"
- **Status padrão?** Se não informado, o status será definido como "novo"
`;

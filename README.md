# Remix of WhatsApp Flow - API Oficial - Remix

Disparador Inteligente de WhatsApp

Visão Geral

Plataforma de disparo de mensagens via WhatsApp com inteligência artificial, capaz de gerar listas de contatos automaticamente, disparar mensagens com variações inteligentes, respeitar ritmos humanos de envio, fazer follow-ups contextuais e analisar resultados — tudo integrado com a Evolution API.

O sistema funciona como um disparador estratégico, não como um chatbot. Ele envia, monitora, analisa e decide os próximos passos, mas não assume o papel de atendimento ao cliente.

1. Geração Automática de Listas (Scraping)

O que faz

Coleta automaticamente informações de contatos a partir de sites, diretórios e páginas públicas na internet usando o Firecrawl.

Funcionalidades

Coleta sob demanda: O usuário informa uma URL (ex: um diretório de empresas, uma página de listagem, um portal de nicho) e define quais informações quer extrair: nome, telefone, e-mail, empresa, cidade, segmento. O sistema varre a página e retorna uma lista estruturada.

Coleta recorrente: O usuário pode programar coletas automáticas. Exemplo: "toda segunda-feira, varrer o diretório X e trazer novos contatos". O sistema compara com o que já existe e adiciona apenas os novos.

Limpeza automática: Todos os telefones coletados são padronizados para o formato brasileiro (+55). Dados duplicados são removidos automaticamente. Contatos sem telefone válido são descartados ou marcados como incompletos.

Validação de WhatsApp: Antes de entrar na lista de disparo, o sistema verifica se o número coletado realmente possui WhatsApp ativo.

Score de qualidade: Cada contato recebe uma pontuação baseada na completude das informações: tem nome, tem telefone válido, tem e-mail, tem empresa identificada. Contatos com score mais alto são priorizados nos disparos.

2. Gestão de Listas e Contatos

O que faz

Organiza todos os contatos do sistema em listas segmentadas, com controle de status e histórico.

Funcionalidades

Criação de listas: Listas podem ser criadas manualmente, geradas automaticamente pelo scraping, ou importadas a partir de planilhas (CSV/Excel).

Segmentação por tags: Cada contato pode receber tags como cidade, nicho, origem (de qual fonte veio), campanha que participou. Isso permite criar campanhas muito direcionadas.

Deduplicação cross-lista: Se o mesmo número existe em duas listas diferentes e ambas são usadas na mesma campanha, o contato recebe apenas uma mensagem.

Blacklist automática: Quando alguém responde pedindo para sair ou bloqueia o número, é automaticamente adicionado a uma lista negra global. Esse contato nunca mais recebe mensagens de nenhuma campanha.

Status por contato: Cada contato tem um status que evolui ao longo do tempo:

Novo — Ainda não recebeu nenhuma mensagem

Disparado — Recebeu a mensagem, mas não respondeu

Respondeu — Mandou alguma resposta

Em atendimento (IA) — Uma IA externa está conversando com esse contato

Em atendimento (Humano) — Um vendedor ou atendente assumiu a conversa

Abandonado — Respondeu, mas ninguém deu continuidade (nem IA, nem humano)

Follow-up pendente — Aguardando o próximo follow-up programado

Convertido — Atingiu o objetivo da campanha

Sem interesse — Recusou de forma clara

Opt-out — Pediu para não receber mais mensagens

Bloqueado — Bloqueou ou reportou o número

3. Criação de Campanhas

O que faz

Uma campanha é o "pacote" que une lista de contatos, mensagens, regras de envio e follow-ups.

Funcionalidades

Configuração da campanha: Cada campanha tem um nome, um objetivo (prospecção, reativação, divulgação de evento, lançamento), uma ou mais listas vinculadas, e um perfil de disparo.

Sequência de mensagens: Uma campanha pode ter múltiplas etapas, não apenas um único disparo:

Mensagem 1: Abordagem inicial

Mensagem 2: Primeiro follow-up (se não respondeu em X tempo)

Mensagem 3: Segundo follow-up

Mensagem 4: Mensagem de encerramento ("vou parar de te contatar")

Cada etapa pode ter suas próprias variações de mensagem e tipo de mídia.

Agendamento: O usuário define data de início, janela de horário permitida (ex: 8h às 18h), e dias da semana em que o disparo pode acontecer.

Estimativa antes de iniciar: Com base na configuração de velocidade e no tamanho da lista, o sistema mostra uma estimativa: "Com essas configurações, o disparo completo levará aproximadamente X dias úteis."

4. Motor de Disparo e Controle de Ritmo

O que faz

Controla a velocidade e o padrão de envio das mensagens para simular comportamento humano e proteger os números.

Como funciona

O usuário configura três parâmetros principais:

Intervalo entre mensagens: Define o tempo médio entre um envio e outro, com uma margem de variação. Exemplo: centro de 30 segundos com variação de ±10 segundos. Cada envio vai ter um delay diferente, sorteado entre 20 e 40 segundos, com tendência a ficar próximo dos 30 (comportamento mais natural).

Tamanho do bloco: Define quantas mensagens são enviadas antes de uma pausa longa. Exemplo: blocos de 20 mensagens. Esse número também pode variar levemente (18 a 22) para não criar um padrão previsível.

Intervalo entre blocos: Define o tempo de pausa entre um bloco e outro. Exemplo: centro de 2 horas com variação de ±30 minutos. Cada pausa será diferente, sorteada entre 1h30 e 2h30.

O ciclo resultante: Envia 20 mensagens com ~30 segundos entre cada uma → pausa de ~2 horas → envia mais 20 → pausa de ~1h45 → envia mais 19 → pausa de ~2h20 → e assim por diante.

Perfis de distância (presets)

Para facilitar, o sistema oferece perfis pré-configurados que o usuário pode selecionar com um clique:

Conservador: Intervalo de 60 segundos (±20s) entre mensagens, blocos de 15 mensagens (±3), pausa de 3 horas (±1h) entre blocos. Resultado: aproximadamente 60 mensagens por dia.

Moderado: Intervalo de 35 segundos (±10s), blocos de 20 (±4), pausa de 1h30 (±30min). Resultado: aproximadamente 120 mensagens por dia.

Agressivo: Intervalo de 20 segundos (±8s), blocos de 30 (±5), pausa de 45 minutos (±15min). Resultado: aproximadamente 250 mensagens por dia.

Personalizado: O usuário define todos os valores manualmente.

O perfil pode ser trocado no meio de uma campanha — a mudança vale a partir do próximo bloco.

Proteções automáticas

Janela de envio: Se a pausa entre blocos cair fora do horário permitido (ex: seria 19h30 mas a janela fecha às 18h), o sistema retoma no dia seguinte no horário de início configurado.

Limite diário absoluto: Mesmo que sobre tempo na janela de envio, o sistema não ultrapassa um número máximo de mensagens por dia definido pelo usuário.

Warm-up de número novo: Números recém-criados começam com volume reduzido e vão aumentando gradativamente ao longo dos dias: dia 1 = 20 mensagens, dia 2 = 35, dia 3 = 50, até atingir o teto configurado.

Detecção de problemas: Se a taxa de falha nas entregas subir acima de um limite, o sistema reduz automaticamente a velocidade. Se continuar subindo, pausa completamente e notifica o usuário.

5. Variação de Mensagens

O que faz

Garante que cada mensagem enviada seja ligeiramente diferente da anterior, evitando detecção de padrão repetitivo pelo WhatsApp.

Funcionalidades

Variação por blocos intercambiáveis (Spintax): O usuário escreve a mensagem com alternativas dentro de chaves. O sistema sorteia uma combinação única para cada envio.

Exemplo: "{Oi|Olá|E aí}, {tudo bem|tudo certo|como vai}? Meu nome é {Rafael|a equipe do Rafael}..."

Cada disparo gera uma versão diferente: "Olá, tudo certo? Meu nome é Rafael..." / "Oi, tudo bem? Meu nome é a equipe do Rafael..."

Blocos opcionais: Parágrafos inteiros que podem entrar ou não na mensagem, sorteados aleatoriamente. Isso muda o comprimento e a estrutura da mensagem a cada envio.

Ordem variável: Argumentos e parágrafos que podem ser reorganizados em ordens diferentes a cada envio.

Alternância de formato: O sistema alterna o tipo de mídia ao longo dos envios: mensagem de texto puro → texto com imagem → áudio → texto com link. A rotação é configurável por campanha.

Personalização dinâmica: Campos como nome, empresa, cidade e segmento do contato são inseridos automaticamente na mensagem quando disponíveis. Se o contato não tem nome, usa uma versão genérica.

Geração por IA: A partir de um texto-base e um prompt, a IA pode gerar múltiplas variações únicas da mensagem para abastecer o banco de templates da campanha.

Controle de unicidade: O sistema registra cada mensagem gerada e garante que não haja repetição exata em sequência.

6. Follow-up Inteligente com IA

O que faz

Analisa o histórico completo da conversa de cada contato e decide se faz sentido enviar um follow-up, quando enviar, e qual mensagem mandar.

O diferencial: visão completa da conversa

A Evolution API monitora e salva todas as mensagens de cada conversa — não apenas as que o disparador enviou. Isso inclui:

Mensagens enviadas pelo próprio disparador

Mensagens enviadas por uma IA externa de atendimento (se houver uma conectada)

Mensagens enviadas por um humano (vendedor que assumiu pelo WhatsApp ou painel)

Mensagens recebidas do contato (respostas)

Com essa visão completa, o follow-up deixa de ser um simples "reenviar se não respondeu" e se torna uma decisão analítica.

Lógica de decisão

Quando chega o momento programado de um follow-up, o sistema analisa o histórico completo e decide entre quatro ações:

Enviar follow-up: O contato não respondeu e ninguém mais interagiu com ele. O follow-up segue normalmente. A IA gera uma mensagem contextualizada baseada no que já foi enviado.

Pular follow-up: Já existe uma conversa em andamento. Uma IA externa está atendendo ou um vendedor assumiu. Não faz sentido o disparador interferir.

Cancelar follow-up: O contato fez opt-out, foi convertido, ou demonstrou claramente que não tem interesse. Nenhum follow-up futuro será enviado.

Alertar: O contato respondeu, mas ninguém deu continuidade (nem IA, nem humano). O sistema marca como "abandonado" e notifica a equipe.

Cenários detalhados

Ninguém interagiu depois do disparo: O contato não respondeu e nenhuma IA ou humano falou com ele. Follow-up segue a sequência configurada na campanha.

O contato respondeu e a IA externa já atendeu: O sistema verifica se a conversa teve um desfecho (venda, recusa, agendamento) ou se morreu no meio. Se a conversa morreu — o contato parou de responder durante o atendimento da IA — o follow-up pode retomar o assunto com base no que foi conversado.

Um humano assumiu a conversa: O disparador para automaticamente qualquer follow-up programado. Só retoma se o humano marcar o contato como "devolver para automação" ou se passar um tempo configurável sem nenhuma interação de nenhum lado.

O contato respondeu mas ninguém atendeu: Lead abandonado. O sistema gera um alerta para a equipe e, opcionalmente, envia um follow-up contextual como: "Desculpa a demora! Voltando aqui sobre o que você perguntou..."

Follow-up contextualizado

Quando a IA gera o follow-up, ela não envia uma mensagem genérica. Ela recebe:

O objetivo e o tom da campanha

A mensagem original que foi disparada

Todo o histórico da conversa (incluindo o que outras partes disseram)

O status atual do contato

Em qual follow-up está (1º, 2º, 3º)

Com isso, o follow-up é personalizado. Se o contato mencionou um problema específico, o follow-up aborda aquele problema. Se ele fez uma pergunta, o follow-up responde ou retoma a partir daquele ponto.

Configuração do follow-up na campanha

Quantidade de follow-ups (1, 2, 3...)

Intervalo entre cada um (24h, 48h, 72h...)

Prompt/contexto base para a IA usar na geração das mensagens

Condições de parada: respondeu, opt-out, convertido, limite de tentativas atingido

7. Regras de Convivência entre Agentes

O que faz

Gerencia a prioridade entre o disparador, uma IA externa de atendimento e atendentes humanos, para que não haja conflito de mensagens.

Hierarquia de prioridade

Humano — Quando um vendedor ou atendente assume a conversa, tudo mais para. O humano tem prioridade total.

IA externa — Se uma IA de atendimento está conversando com o contato, o disparador fica em espera. Só retoma se a IA parar e o contato ficar sem resposta.

Disparador — Funciona normalmente apenas quando ninguém mais está interagindo com o contato.

Regras de cooldown

Se a IA externa mandou mensagem há menos de X horas (configurável), o disparador não envia nada para aquele contato.

Se um humano interagiu há menos de X dias (configurável), o disparador não envia nada.

Esses tempos são configuráveis por campanha.

Identificação de quem enviou

O sistema diferencia automaticamente a origem de cada mensagem no histórico: se veio do disparador, de uma IA externa, de um humano, ou do próprio contato.

8. Análise de Respostas

O que faz

Quando um contato responde, a IA classifica automaticamente o tipo de resposta para alimentar o dashboard e as decisões de follow-up.

Classificações

Interessado — Demonstrou interesse, fez pergunta sobre o produto ou serviço. Gera alerta para o time comercial.

Neutro — Respondeu, mas sem sinal claro. Exemplos: "ok", "hmm", emoji isolado.

Não interessado — Recusou de forma clara.

Opt-out — Pediu para parar de receber mensagens.

Pergunta — Fez uma pergunta específica que precisa de atenção humana.

Essa classificação alimenta automaticamente o status do contato e influencia a decisão de follow-up.

9. Teste A/B

O que faz

Permite testar diferentes versões de mensagem para descobrir qual gera mais resultado.

Funcionalidades

Criação de variantes: Na configuração da campanha, o usuário pode criar 2 ou mais versões da mensagem (em qualquer etapa do fluxo: abordagem inicial, follow-up 1, follow-up 2...).

Divisão da lista: O usuário define a proporção de cada variante: 50/50, 70/30, ou outra combinação. O sistema distribui os contatos aleatoriamente entre as variantes.

Métricas comparativas: Para cada variante, o sistema mede:

Taxa de resposta geral

Taxa de resposta positiva (classificada como "interessado")

Taxa de opt-out

Taxa de conversão (se aplicável)

Amostra mínima: O teste só mostra resultados quando atinge uma quantidade mínima de envios (configurável) para ter relevância.

Auto-winner: Funcionalidade opcional: quando uma variante mostra desempenho claramente superior com confiança suficiente, o sistema pode automaticamente parar de enviar a variante perdedora e direcionar 100% dos envios para a vencedora.

10. Multi-número e Rotação de Instâncias

O que faz

Permite cadastrar múltiplos números de WhatsApp e distribuir os envios entre eles, aumentando a capacidade e reduzindo risco.

Funcionalidades

Cadastro de instâncias: O usuário conecta múltiplos números à plataforma via Evolution API.

Distribuição automática: O sistema divide os envios entre os números disponíveis, respeitando o limite e o estágio de warm-up de cada um.

Monitoramento de saúde: O dashboard mostra o estado de cada número: quantidade de mensagens enviadas, taxa de erro, há quanto tempo está ativo, nível de warm-up.

Rotação em caso de problema: Se um número é bloqueado ou apresenta alta taxa de falha, o sistema redistribui automaticamente a fila para os números restantes e notifica o usuário.

11. Dashboard e Relatórios

O que faz

Painel central com visão completa de todas as campanhas, contatos e métricas.

Visões disponíveis

Por campanha: Total de envios, taxa de entrega, taxa de resposta, taxa de resposta positiva, taxa de opt-out, taxa de conversão. Evolução ao longo do tempo.

Por lista: Performance comparativa entre listas diferentes. Qual origem de leads gera mais resultado.

Por variante (A/B): Comparativo direto entre versões de mensagem.

Por número/instância: Saúde, volume e performance de cada número WhatsApp.

Por horário: Mapa de calor mostrando em quais horários e dias da semana as taxas de resposta são maiores.

Alertas automáticos: Queda brusca na taxa de entrega (possível ban), leads abandonados sem atendimento, número com taxa de erro alta, campanha próxima do limite diário.

Resumo de Módulos

# Módulo Descrição 1 Geração de listas Scraping automático com Firecrawl + validação 2 Gestão de contatos Listas, tags, blacklist, status, deduplicação 3 Campanhas Sequência de mensagens, agendamento, estimativas 4 Motor de disparo Intervalo, blocos, pausas, warm-up, proteções 5 Variação de mensagem Spintax, blocos opcionais, alternância de mídia, IA 6 Follow-up inteligente Análise contextual com IA, decisão de envio 7 Convivência de agentes Prioridade entre disparador, IA externa e humano 8 Análise de respostas Classificação automática por IA 9 Teste A/B Variantes, métricas, auto-winner 10 Multi-número Rotação, distribuição, monitoramento de saúde 11 Dashboard Métricas, relatórios, alertas

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/84e9d5a2-3c16-4d56-939b-ec8ee71d727e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

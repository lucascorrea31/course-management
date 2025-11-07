# Configuração do Telegram Bot

Este documento explica como configurar o bot do Telegram para gerenciar alunos no grupo.

## 📋 Pré-requisitos

1. Um bot do Telegram criado via [@BotFather](https://t.me/botfather)
2. Um grupo ou supergrupo no Telegram
3. O bot adicionado ao grupo

## 🤖 Criar o Bot

1. Abra o Telegram e procure por [@BotFather](https://t.me/botfather)
2. Envie `/newbot`
3. Escolha um nome para o bot (ex: "Meu Curso Bot")
4. Escolha um username único (deve terminar com `bot`, ex: `meucurso_bot`)
5. Copie o **token** fornecido (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## 🆔 Obter o Chat ID

### Método 1: Via Bot

1. Adicione o bot [@getmyid_bot](https://t.me/getmyid_bot) ao seu grupo
2. O bot enviará o Chat ID do grupo automaticamente
3. O Chat ID será algo como `-1001234567890` (com o sinal de menos!)

### Método 2: Via API

1. Adicione seu bot ao grupo
2. Envie qualquer mensagem no grupo
3. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. Procure por `"chat":{"id":-1001234567890}`

## ⚙️ Configuração

Existem **2 opções** de configuração:

---

## 🎯 Opção 1: Bot Administrador (Recomendado)

### Vantagens
- ✅ Gera links únicos por aluno
- ✅ Links com prazo de validade
- ✅ Pode remover alunos automaticamente
- ✅ Controle total sobre o grupo

### Configuração

#### 1. Adicione o bot ao grupo como administrador

1. Abra o grupo no Telegram
2. Clique no nome do grupo no topo
3. Vá em **Administradores**
4. Clique em **Adicionar Administrador**
5. Procure pelo username do seu bot
6. Habilite as seguintes permissões:
   - ✅ **Invite users via link** (OBRIGATÓRIO)
   - ✅ **Ban users** (para remover alunos)
   - ✅ **Delete messages** (opcional, para moderar)
7. Clique em **Salvar**

#### 2. Configure as variáveis de ambiente

No arquivo `.env.local`:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

#### 3. Teste

```bash
# Teste se o bot consegue gerar links
curl -X POST http://localhost:3000/api/telegram \
  -H "Content-Type: application/json" \
  -d '{"action": "add", "studentEmail": "teste@exemplo.com"}'
```

Deve retornar um link de convite único:
```json
{
  "success": true,
  "inviteLink": "https://t.me/+abc123xyz..."
}
```

---

## 🔗 Opção 2: Link Permanente (Sem Admin)

### Vantagens
- ✅ Não precisa de permissões de admin
- ✅ Configuração mais simples
- ✅ Funciona imediatamente

### Desvantagens
- ❌ Mesmo link para todos os alunos
- ❌ Link não expira
- ❌ Não pode remover alunos automaticamente

### Configuração

#### 1. Adicione o bot ao grupo

1. Abra o grupo
2. Adicionar membros
3. Procure pelo username do bot
4. Adicione (não precisa ser admin)

#### 2. Gere um link de convite permanente

1. Abra o grupo no Telegram
2. Clique no nome do grupo
3. Vá em **Invite Links**
4. Clique em **Create a New Link**
5. Configure:
   - Nome: "Alunos do Curso"
   - Deixe sem expiração
   - Deixe sem limite de usos
6. Copie o link gerado (ex: `https://t.me/+xYz789aBc...`)

#### 3. Configure as variáveis de ambiente

No arquivo `.env.local`:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Link permanente (Opção 2)
TELEGRAM_INVITE_LINK=https://t.me/+xYz789aBc...
```

#### 4. Teste

```bash
curl -X POST http://localhost:3000/api/telegram \
  -H "Content-Type: application/json" \
  -d '{"action": "add", "studentEmail": "teste@exemplo.com"}'
```

Deve retornar o link permanente configurado:
```json
{
  "success": true,
  "inviteLink": "https://t.me/+xYz789aBc..."
}
```

---

## 🔄 Funcionamento Automático

### Com Bot Admin (Opção 1)

```
1. Venda aprovada na Kiwify
2. Webhook cria registro do aluno
3. Bot gera link único (expira em 7 dias)
4. Link é enviado ao aluno
5. Aluno entra no grupo
6. Bot atualiza status para "active"
```

**Remoção Automática:**
```
1. Reembolso ou chargeback
2. Webhook detecta
3. Bot remove aluno do grupo
4. Status atualizado para "removed"
```

### Com Link Permanente (Opção 2)

```
1. Venda aprovada na Kiwify
2. Webhook cria registro do aluno
3. Sistema usa link permanente
4. Link é enviado ao aluno
5. Aluno entra no grupo
6. Status atualizado manualmente
```

**Remoção Manual:**
- Você precisa remover alunos manualmente do grupo
- O sistema não consegue remover automaticamente

---

## 🐛 Troubleshooting

### Erro: "not enough rights to manage chat invite link"

**Problema:** Bot não tem permissões suficientes.

**Solução:**
- **Opção A:** Promova o bot a admin com permissão "Invite users via link"
- **Opção B:** Configure `TELEGRAM_INVITE_LINK` com um link permanente

### Erro: "Chat not found"

**Problema:** CHAT_ID incorreto.

**Solução:**
- Certifique-se que o CHAT_ID começa com `-` (grupos têm ID negativo)
- Use [@getmyid_bot](https://t.me/getmyid_bot) para obter o ID correto

### Erro: "Bot was kicked from the chat"

**Problema:** Bot foi removido do grupo.

**Solução:**
- Adicione o bot de volta ao grupo
- Verifique se o bot tem permissões corretas

### Link não funciona

**Problema:** Link pode ter expirado ou sido revogado.

**Solução:**
- Gere um novo link
- Use link permanente (Opção 2)

---

## 🎨 Customização

### Alterar tempo de expiração do link

No arquivo `lib/telegram.ts`:

```typescript
// Altere de 7 dias para 30 dias
const inviteLink = await generateInviteLink(30 * 24 * 60 * 60, 1);
```

### Remover limite de usos

```typescript
// Remove limite de 1 pessoa por link
const inviteLink = await generateInviteLink(7 * 24 * 60 * 60);
```

### Mensagem de boas-vindas

Configure no próprio Telegram:
1. Grupo > Configurações
2. Editar Grupo
3. Definir mensagem de boas-vindas

---

## 📊 Monitoramento

### Ver status dos alunos no Telegram

```bash
curl http://localhost:3000/api/students
```

Retorna todos os alunos com status do Telegram:
- `pending`: Link gerado, aguardando entrada
- `active`: Aluno entrou no grupo
- `removed`: Aluno foi removido
- `failed`: Erro ao gerar link

### Verificar se bot está funcionando

```bash
curl https://api.telegram.org/bot<SEU_TOKEN>/getMe
```

Deve retornar informações do bot.

---

## 🔒 Segurança

1. **Nunca compartilhe** o token do bot publicamente
2. **Use .env.local** para armazenar credenciais
3. **Não commite** o arquivo `.env.local` no git
4. **Revogue** links antigos periodicamente
5. **Monitore** entradas suspeitas no grupo

---

## ✅ Checklist de Configuração

### Opção 1: Bot Admin
- [ ] Bot criado via @BotFather
- [ ] Token copiado
- [ ] Bot adicionado ao grupo
- [ ] Bot promovido a admin
- [ ] Permissão "Invite users via link" habilitada
- [ ] Permissão "Ban users" habilitada
- [ ] TELEGRAM_BOT_TOKEN configurado
- [ ] TELEGRAM_CHAT_ID configurado
- [ ] Teste realizado com sucesso

### Opção 2: Link Permanente
- [ ] Bot criado via @BotFather
- [ ] Token copiado
- [ ] Bot adicionado ao grupo (não precisa ser admin)
- [ ] Link permanente criado no grupo
- [ ] Link permanente copiado
- [ ] TELEGRAM_BOT_TOKEN configurado
- [ ] TELEGRAM_CHAT_ID configurado
- [ ] TELEGRAM_INVITE_LINK configurado
- [ ] Teste realizado com sucesso

---

## 📚 Recursos Adicionais

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf Documentation](https://telegraf.js.org/)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

---

## 💡 Dicas

1. **Use Opção 1** se você quer controle total e automação
2. **Use Opção 2** se você quer simplicidade e não se importa em gerenciar manualmente
3. **Configure webhooks** para receber atualizações em tempo real
4. **Teste** sempre em um grupo de testes antes do grupo real
5. **Documente** o link de convite em local seguro

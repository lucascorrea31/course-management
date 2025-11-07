
# Telegram Webhook Setup

O webhook do Telegram é essencial para automaticamente capturar quando alunos entram ou saem do grupo.

## Por que é necessário?

A API do Telegram Bot não permite listar todos os membros de um grupo. Para saber quem está no grupo e poder remover quem não deveria estar lá, precisamos:

1. **Capturar quando alguém entra** → Salvar o userId no banco de dados
2. **Capturar quando alguém sai** → Atualizar o status no banco
3. **Validar automaticamente** → Se alguém não é aluno, remove imediatamente

## Setup do Webhook

### 1. Configure o webhook

**Opção A: Via Browser** (Recomendado)

Acesse no seu navegador (após fazer login):
```
https://seu-dominio.com/api/telegram/webhook?action=setup
```

**Opção B: Via cURL**
```bash
curl "https://seu-dominio.com/api/telegram/webhook?action=setup"
```

### 2. Verifique se está funcionando

```bash
curl "https://seu-dominio.com/api/telegram/webhook?action=info"
```

Você deve ver uma resposta com:
```json
{
  "success": true,
  "webhook": {
    "url": "https://seu-dominio.com/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 3. Teste o webhook

1. Adicione alguém ao grupo do Telegram
2. Verifique os logs da aplicação
3. Você deve ver mensagens como:
```
New member joined: João Silva (ID: 123456789, @joaosilva)
✅ Updated student João Silva with Telegram userId 123456789
```

## O que o webhook faz

### Quando alguém entra no grupo:

1. **Se for um aluno pendente**:
   - Salva o userId do Telegram
   - Atualiza o status para "active"
   - Registra o username
   - Registra a data de entrada

2. **Se NÃO for um aluno**:
   - Verifica se é admin (mantém no grupo)
   - Se não for admin: **REMOVE AUTOMATICAMENTE**
   - Envia mensagem no grupo informando a remoção

### Quando alguém sai do grupo:

- Atualiza o status do aluno para "removed"
- Registra a data de saída

## Limpeza de membros existentes

Para limpar membros que já estavam no grupo antes do webhook:

1. **Configure o webhook primeiro** (passos acima)
2. **Execute a limpeza manual**:
   - Acesse a página de Alunos
   - Clique em "Limpar Grupo"
   - Isso vai verificar todos os alunos registrados com userId

3. **Para membros sem userId registrado**:
   - Eles precisam sair e entrar novamente no grupo
   - Quando entrarem, o webhook vai capturar o userId
   - OU você pode removê-los manualmente do Telegram

## Troubleshooting

### Webhook não está recebendo updates

1. **Verifique se o webhook está configurado**:
```bash
curl "https://seu-dominio.com/api/telegram/webhook?action=info"
```

2. **Verifique se a URL está correta**:
   - Deve ser HTTPS (não HTTP)
   - Deve ser acessível publicamente
   - Deve apontar para `/api/telegram/webhook`

3. **Reconfigure o webhook**:
```bash
curl "https://seu-dominio.com/api/telegram/webhook?action=delete"
curl "https://seu-dominio.com/api/telegram/webhook?action=setup"
```

### Bot não remove membros desconhecidos

1. Verifique se o bot tem permissões de admin no grupo:
   - Adicionar/remover membros
   - Enviar mensagens

2. Verifique os logs da aplicação para erros

### Alunos registrados sendo removidos

1. Verifique se o aluno tem produtos ativos:
```bash
curl "http://localhost:3000/api/students/debug"
```

2. Verifique se o `isActive` está true

## Configuração em produção (Vercel)

Se você está usando Vercel, o webhook já vai funcionar automaticamente:

1. Faça deploy da aplicação
2. Acesse: `https://seu-app.vercel.app/api/telegram/webhook?action=setup`
3. Pronto!

## Desenvolvimento local

Para testar localmente, você precisa de uma URL pública. Use **ngrok**:

```bash
# Instale ngrok
npm install -g ngrok

# Inicie sua aplicação Next.js
pnpm dev

# Em outro terminal, exponha localmente
ngrok http 3000

# Configure o webhook com a URL do ngrok
curl "https://abc123.ngrok.io/api/telegram/webhook?action=setup"
```

## Remover webhook (se necessário)

```bash
curl "https://seu-dominio.com/api/telegram/webhook?action=delete"
```

Isso vai fazer o Telegram parar de enviar updates para sua aplicação.

## Diagrama de fluxo

```
Aluno recebe link → Clica no link → Entra no grupo
                                        ↓
                    Telegram envia update para webhook
                                        ↓
                        Webhook verifica se é aluno
                                        ↓
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                 É aluno                              Não é aluno
                    │                                       │
            Salva userId no banco                    É admin?
            Status = "active"                              │
                                                    ┌──────┴──────┐
                                                   Sim           Não
                                                    │             │
                                              Mantém no      Remove do
                                                grupo          grupo
```

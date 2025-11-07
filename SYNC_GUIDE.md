# Sistema de Sincronização Automática de Alunos

Este documento explica como configurar e usar o sistema de sincronização automática que busca vendas da Kiwify e cria/atualiza registros de alunos no MongoDB.

## Visão Geral

O sistema de sincronização:
- Busca automaticamente vendas de todos os produtos cadastrados
- Cria ou atualiza registros de alunos com todas as informações da Kiwify
- Salva dados completos do cliente (endereço, CPF, Instagram, etc.)
- Vincula alunos aos produtos que compraram
- Mantém histórico de vendas e métodos de pagamento

## Estrutura de Dados

### Student Model (Aluno)

O modelo `Student` armazena todas as informações do cliente vindas da API Kiwify:

```typescript
{
  userId: ObjectId,              // ID do usuário/produtor
  kiwifyCustomerId: string,      // ID do cliente na Kiwify
  name: string,                  // Nome completo
  email: string,                 // Email (único por usuário)
  phone: string,                 // Telefone/celular
  cpf: string,                   // CPF
  cnpj: string,                  // CNPJ (se pessoa jurídica)
  instagram: string,             // Handle do Instagram
  country: string,               // País
  address: {                     // Endereço completo
    street: string,
    number: string,
    complement: string,
    neighborhood: string,
    city: string,
    state: string,
    zipcode: string
  },
  telegram: {                    // Status do Telegram
    userId: number,
    username: string,
    status: "pending" | "active" | "removed" | "failed",
    addedAt: Date,
    removedAt: Date
  },
  products: [{                   // Produtos que o aluno comprou
    productId: ObjectId,
    productName: string,
    enrolledAt: Date,
    status: "active" | "expired" | "refunded",
    saleId: string,              // ID da venda na Kiwify
    saleReference: string,        // Referência da venda
    paymentMethod: string,        // Método de pagamento
    amount: number                // Valor pago
  }],
  isActive: boolean,             // Se o aluno está ativo
  lastSyncAt: Date               // Data da última sincronização
}
```

## Endpoints da API

### 1. Sincronização Automática (Cron Job)

**POST** `/api/sync/students`

Busca vendas da Kiwify e sincroniza alunos automaticamente.

#### Autenticação

**Opção 1: Sessão do Usuário** (para uso manual no dashboard)
```bash
curl -X POST https://seu-dominio.com/api/sync/students \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"
```

**Opção 2: API Key** (para cron jobs automáticos)
```bash
curl -X POST https://seu-dominio.com/api/sync/students \
  -H "x-api-key: SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

#### Sincronizar todos os usuários
```bash
curl -X POST https://seu-dominio.com/api/sync/students \
  -H "x-api-key: SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json"
```

#### Sincronizar usuário específico
```bash
curl -X POST https://seu-dominio.com/api/sync/students \
  -H "x-api-key: SUA_API_KEY_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_AQUI"}'
```

#### Resposta
```json
{
  "success": true,
  "message": "Sync completed. Created 5 students, updated 10 students, processed 15 sales.",
  "results": {
    "studentsCreated": 5,
    "studentsUpdated": 10,
    "salesProcessed": 15,
    "errors": [],
    "details": [
      "Created student João Silva for product Curso de React",
      "Updated student Maria Santos for product Curso de Node.js"
    ]
  }
}
```

### 2. Status da Sincronização

**GET** `/api/sync/students`

Retorna informações sobre a última sincronização e estatísticas.

```bash
curl https://seu-dominio.com/api/sync/students \
  -H "Cookie: next-auth.session-token=..."
```

#### Resposta
```json
{
  "success": true,
  "lastSyncAt": "2025-11-07T12:30:00.000Z",
  "totalStudents": 150,
  "activeStudents": 142
}
```

## Configuração do Cron Job

### Opção 1: Vercel Cron Jobs (Recomendado)

1. Adicione a API key nas variáveis de ambiente da Vercel:
   - `SYNC_API_KEY`: Gere uma chave secura (ex: `openssl rand -base64 32`)

2. Crie o arquivo `vercel.json` na raiz do projeto:
```json
{
  "crons": [
    {
      "path": "/api/sync/students",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

3. Configure o middleware para aceitar a API key:
```typescript
// middleware.ts ou em route.ts
const apiKey = request.headers.get("x-api-key");
if (apiKey === process.env.SYNC_API_KEY) {
  // Allow cron job
}
```

#### Schedules Comuns:
- `0 */6 * * *` - A cada 6 horas
- `0 */12 * * *` - A cada 12 horas
- `0 0 * * *` - Uma vez por dia (meia-noite)
- `0 2 * * *` - Uma vez por dia (2h da manhã)

### Opção 2: EasyCron (Serviço Externo)

1. Crie uma conta em [EasyCron](https://www.easycron.com/)

2. Configure um novo cron job:
   - **URL**: `https://seu-dominio.com/api/sync/students`
   - **Method**: POST
   - **Headers**:
     ```
     x-api-key: SUA_API_KEY_AQUI
     Content-Type: application/json
     ```
   - **Cron Expression**: `0 */6 * * *` (a cada 6 horas)

### Opção 3: GitHub Actions (Gratuito)

Crie `.github/workflows/sync-students.yml`:

```yaml
name: Sync Students from Kiwify

on:
  schedule:
    # Runs every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch: # Permite execução manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync Students
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/sync/students \
            -H "x-api-key: ${{ secrets.SYNC_API_KEY }}" \
            -H "Content-Type: application/json"
```

Configure os secrets no GitHub:
- `APP_URL`: `https://seu-dominio.com`
- `SYNC_API_KEY`: Sua API key secreta

### Opção 4: Cron.job.org (Gratuito)

1. Acesse [cron-job.org](https://cron-job.org)
2. Crie um novo cron job:
   - **Title**: Sync Students
   - **URL**: `https://seu-dominio.com/api/sync/students`
   - **Schedule**: Every 6 hours
   - **Request Method**: POST
   - **Headers**:
     ```
     x-api-key: SUA_API_KEY_AQUI
     Content-Type: application/json
     ```

## Variáveis de Ambiente

Adicione no `.env.local`:

```bash
# Sync API Key (gere uma chave segura)
SYNC_API_KEY=sua_chave_secreta_aqui_use_openssl_rand_base64_32

# Kiwify API Credentials (já existentes)
KIWIFY_ACCOUNT_ID=your_account_id
KIWIFY_CLIENT_ID=your_client_id
KIWIFY_CLIENT_SECRET=your_client_secret
```

## Sincronização Manual

Você também pode criar um botão no dashboard para sincronizar manualmente:

```typescript
// Em seu componente React
const handleSync = async () => {
  const response = await fetch('/api/sync/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  console.log(data);
};
```

## Monitoramento

### Logs

Todos os logs de sincronização são registrados no console:

```
🔄 Syncing students for user: user@example.com
📦 Found 3 products for user user@example.com
  📊 Fetching sales for product: Curso de React
  ✅ Found 10 sales for Curso de React
  ✅ Created student João Silva for product Curso de React
  ✅ Updated student Maria Santos for product Curso de React
✅ Sync completed!
📊 Results:
  - Students created: 5
  - Students updated: 10
  - Sales processed: 15
  - Errors: 0
```

### Erros Comuns

#### 401 Unauthorized
- Verifique se a API key está correta
- Verifique se o header `x-api-key` está sendo enviado

#### 500 Internal Server Error
- Verifique os logs do servidor
- Verifique se as credenciais da Kiwify estão corretas
- Verifique se o MongoDB está acessível

#### Sales not syncing
- Verifique se os produtos estão cadastrados no sistema
- Verifique se o `kiwifyId` do produto corresponde ao ID na Kiwify
- Verifique se as vendas são dos últimos 90 dias (período padrão)

## Webhook vs Sincronização Agendada

### Webhook (Tempo Real)
- ✅ Atualização instantânea quando há nova venda
- ✅ Menor carga no servidor
- ❌ Requer configuração na Kiwify
- ❌ Pode perder eventos se o servidor estiver offline

### Sincronização Agendada (Cron)
- ✅ Não perde nenhuma venda
- ✅ Funciona mesmo se o webhook falhar
- ✅ Sincroniza vendas antigas automaticamente
- ❌ Demora mais para refletir novas vendas

**Recomendação**: Use **ambos** para máxima confiabilidade!

## Próximos Passos

1. ✅ Configure as variáveis de ambiente
2. ✅ Escolha e configure um método de cron job
3. ✅ Teste a sincronização manual primeiro
4. ✅ Monitore os logs nas primeiras execuções
5. ✅ Configure alertas de erro (opcional)

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console
2. Teste a API manualmente com curl
3. Verifique as credenciais da Kiwify
4. Consulte a documentação da API Kiwify: https://docs.kiwify.com.br/

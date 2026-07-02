# Savigny Catálogo

Catálogo digital B2B da Savigny Distribuidora.

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Postgres, Storage, Edge Functions)
- Deploy: Vercel

## Setup local

```sh
git clone https://github.com/saulorfsantos/savigny-catalog.git
cd savigny-catalog
npm install
cp .env.example .env
# Preencha .env com as credenciais do projeto Supabase
npm run dev
```

App em http://localhost:8080

## Supabase

Projeto: **Savigny Catalogo** (`upnfruonbcjvtmlxnihi`)

```sh
supabase login
supabase link --project-ref upnfruonbcjvtmlxnihi
supabase db push
supabase functions deploy search-image
supabase functions deploy search-image
supabase secrets set SERPER_API_KEY="sua-chave"  # obrigatório para busca de imagens

### Buscar imagens em massa (Serper + Storage)

```bash
# 1. Configure SERPER_API_KEY no Supabase (uma vez)
supabase secrets set SERPER_API_KEY="sua-chave"
supabase functions deploy search-image

# 2. Rode o script (consome 1 crédito Serper por produto)
SUPABASE_URL=https://upnfruonbcjvtmlxnihi.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key \
node scripts/fetch-product-images.mjs

# Testar com 5 produtos primeiro:
node scripts/fetch-product-images.mjs --limit 5
```
```

### Admin

Usuários admin precisam de uma linha em `user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('uuid-do-usuario-auth', 'admin');
```

## Deploy (Vercel)

Variáveis de ambiente necessárias:

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon/public |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |

Configure também em **Supabase → Authentication → URL Configuration**:

- Site URL: `https://savigny-catalog.vercel.app`
- Redirect URLs: `https://savigny-catalog.vercel.app/reset-password`

**Produção:** https://savigny-catalog.vercel.app

## Scripts

```sh
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run preview  # preview do build
npm run lint     # ESLint
npm run test     # testes
```

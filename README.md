# Operador de Crédito Senna Motors → Grupo de WhatsApp

"Descubra quanto libera pra você em minutos." Página com formulário de simulação de crédito. Ao enviar, uma mensagem formatada cai no grupo dos vendedores.

## Estrutura

- `index.html` – formulário no visual Senna Motors (máscaras e validação de CPF no navegador)
- `banner.jpg` – banner do topo da página
- `api/lead.js` – função da Vercel: valida de novo no servidor e dispara o WhatsApp
- `.env.example` – variáveis que você configura na Vercel

## Como publicar na Vercel

1. Crie um repositório no GitHub e suba esta pasta (ou use `npx vercel` no terminal dentro dela).
2. Na Vercel: **Add New → Project** e importe o repositório.
3. Em **Settings → Environment Variables**, cadastre as variáveis do `.env.example` conforme sua API:
   - **Z-API:** `PROVIDER=zapi`, `ZAPI_INSTANCE`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`, `WHATSAPP_GROUP_ID`
   - **Evolution:** `PROVIDER=evolution`, `EVOLUTION_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_APIKEY`, `WHATSAPP_GROUP_ID`
4. Faça o deploy (ou **Redeploy** depois de cadastrar as variáveis).
5. Abra o link, preencha o formulário e confira se a mensagem chegou no grupo.

## Como achar o ID do grupo

- **Z-API:** painel da instância → ou chamada `GET /chats` / `GET /groups` — o ID tem o formato `NÚMEROS-group`.
- **Evolution:** `GET /group/fetchAllGroups/{instância}?getParticipants=false` — o ID termina em `@g.us`.
- O número conectado na API precisa **estar dentro do grupo**.

## Cuidados

- Use um **chip dedicado** na API não oficial (risco de banimento pela Meta).
- Nunca coloque chaves no `index.html`; elas ficam só nas variáveis da Vercel.
- O formulário coleta CPF e data de nascimento: mantenha o aviso de consentimento (LGPD) e não guarde esses dados além do necessário. Esta versão **não grava nada em banco**, só envia a mensagem.
- Para proteger contra spam, há um campo-armadilha (honeypot). Se começar a receber lixo, vale adicionar Cloudflare Turnstile ou reCAPTCHA.

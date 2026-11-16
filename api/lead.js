// Função serverless da Vercel: recebe o formulário e dispara a mensagem no grupo de WhatsApp.
// Suporta Z-API e Evolution API (v2). Escolha com a variável PROVIDER.

const onlyDigits = (s = '') => String(s).replace(/\D/g, '');
const clean = (s = '', max = 120) => String(s).replace(/[\r\n*_~`]/g, ' ').trim().slice(0, max);

function cpfValido(c) {
  c = onlyDigits(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

function fmtCpf(c) {
  return onlyDigits(c).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function fmtData(iso) {
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function montarMensagem(d) {
  const zap = onlyDigits(d.whatsapp);
  const link = `https://wa.me/55${zap}`;
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return [
    '🚗 *NOVO LEAD – OPERADOR DE CRÉDITO SENNA MOTORS*',
    '',
    `👤 *Nome:* ${clean(d.nome)}`,
    `🪪 *CPF:* ${fmtCpf(d.cpf)}`,
    `🎂 *Nascimento:* ${fmtData(d.nascimento)}`,
    '',
    `💰 *Entrada:* ${clean(d.entrada, 30)}`,
    `📆 *Parcela que cabe:* ${clean(d.parcela, 30)}`,
    `⏱️ *Quer comprar:* ${clean(d.prazo, 40)}`,
    '',
    `⚠️ *Restrição no nome:* ${clean(d.restricao, 20)}`,
    `🪪 *CNH:* ${clean(d.cnh, 20)}`,
    '',
    `📱 *WhatsApp:* ${clean(d.whatsapp, 25)}`,
    `👉 ${link}`,
    '',
    `🕒 ${agora}`
  ].join('\n');
}

async function enviarZapi(texto) {
  const { ZAPI_INSTANCE, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN, WHATSAPP_GROUP_ID } = process.env;
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;
  const headers = { 'Content-Type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
  return fetch(url, { method: 'POST', headers, body: JSON.stringify({ phone: WHATSAPP_GROUP_ID, message: texto }) });
}

async function enviarEvolution(texto) {
  const { EVOLUTION_URL, EVOLUTION_INSTANCE, EVOLUTION_APIKEY, WHATSAPP_GROUP_ID } = process.env;
  const base = EVOLUTION_URL.replace(/\/$/, '');
  return fetch(`${base}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_APIKEY },
    body: JSON.stringify({ number: WHATSAPP_GROUP_ID, text: texto })
  });
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function montarMensagemTelegram(d) {
  const zap = onlyDigits(d.whatsapp);
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return [
    '🚗 <b>NOVO LEAD – OPERADOR DE CRÉDITO SENNA MOTORS</b>',
    '',
    `👤 <b>Nome:</b> ${esc(clean(d.nome))}`,
    `🪪 <b>CPF:</b> ${esc(fmtCpf(d.cpf))}`,
    `🎂 <b>Nascimento:</b> ${esc(fmtData(d.nascimento))}`,
    '',
    `💰 <b>Entrada:</b> ${esc(clean(d.entrada, 30))}`,
    `📆 <b>Parcela que cabe:</b> ${esc(clean(d.parcela, 30))}`,
    `⏱️ <b>Quer comprar:</b> ${esc(clean(d.prazo, 40))}`,
    '',
    `⚠️ <b>Restrição no nome:</b> ${esc(clean(d.restricao, 20))}`,
    `🪪 <b>CNH:</b> ${esc(clean(d.cnh, 20))}`,
    '',
    `📱 <b>WhatsApp:</b> ${esc(clean(d.whatsapp, 25))}`,
    `👉 https://wa.me/55${zap}`,
    '',
    `🕒 ${agora}`
  ].join('\n');
}

async function enviarTelegram(texto) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: texto, parse_mode: 'HTML', disable_web_page_preview: true })
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const d = req.body || {};

  // Honeypot anti-robô: campo invisível que humano não preenche
  if (d.empresa) return res.status(200).json({ ok: true });

  // Validação no servidor (nunca confie só no navegador)
  if (clean(d.nome).split(/\s+/).length < 2) return res.status(400).json({ error: 'Informe o nome completo.' });
  if (!cpfValido(d.cpf)) return res.status(400).json({ error: 'CPF inválido.' });
  if (!d.nascimento) return res.status(400).json({ error: 'Informe a data de nascimento.' });
  if (!d.entrada || !d.parcela) return res.status(400).json({ error: 'Informe entrada e parcela.' });
  if (onlyDigits(d.whatsapp).length < 10) return res.status(400).json({ error: 'WhatsApp inválido.' });
  if (!d.prazo || !d.restricao || !d.cnh) return res.status(400).json({ error: 'Preencha todos os campos.' });

  const provider = (process.env.PROVIDER || 'telegram').toLowerCase();

  try {
    let r;
    if (provider === 'telegram') {
      r = await enviarTelegram(montarMensagemTelegram(d));
    } else {
      const texto = montarMensagem(d);
      r = provider === 'evolution' ? await enviarEvolution(texto) : await enviarZapi(texto);
    }
    if (!r.ok) {
      console.error('Falha no WhatsApp:', r.status, await r.text());
      return res.status(502).json({ error: 'Não foi possível avisar a equipe agora. Tente novamente em instantes.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao enviar:', e);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};

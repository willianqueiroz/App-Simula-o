// Função serverless da Vercel: valida o formulário e envia o lead para o grupo do Telegram.
// Variáveis necessárias na Vercel: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.

const UF_CODES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const onlyDigits = (s = '') => String(s ?? '').replace(/\D/g, '');
const clean = (s = '', max = 120) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const words = s => clean(s).split(' ').filter(Boolean);
const money = s => Number(onlyDigits(s) || 0) / 100;
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
function idade(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  let a = hoje.getFullYear() - y;
  if (hoje.getMonth() < mo - 1 || (hoje.getMonth() === mo - 1 && hoje.getDate() < d)) a--;
  return a;
}
const fmtData = iso => String(iso).split('-').reverse().join('/');
const VENDEDORES = ['Willian Queiroz', 'Monica Barbosa', 'Katarina Ferreira', 'Jeezlene', 'RayElle', 'Samara Gomes', 'Priscila Castro'];
const RESTRICAO =['Não', 'Sim', 'Não sei'];
const PRAZOS = ['O quanto antes', 'Em até 15 dias', 'Em até 30 dias', 'Mais de 30 dias'];
const fmtCpf = c => onlyDigits(c).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const fmtCep = c => onlyDigits(c).replace(/(\d{5})(\d{3})/, '$1-$2');
const fmtTel = t => {
  const d = onlyDigits(t);
  return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

// Validação no servidor (nunca confie só no navegador). Devolve a mensagem de erro ou ''.
function validar(d) {
  if (!VENDEDORES.includes(clean(d.vendedor, 40))) return 'Escolha o vendedor que está te atendendo.';
  if (words(d.nome).length < 2) return 'Informe o nome completo.';
  if (!cpfValido(d.cpf)) return 'CPF inválido.';
  const anos = idade(d.nascimento);
  if (anos === null || anos > 110) return 'Data de nascimento inválida.';
  if (anos < 18) return 'É preciso ter 18 anos ou mais para financiar.';
  if (clean(d.rg).replace(/[^0-9A-Za-z]/g, '').length < 5) return 'Informe o RG.';
  if (!UF_CODES.includes(clean(d.rgUf, 2))) return 'Escolha a UF do RG.';
  if (words(d.mae).length < 2) return 'Informe o nome completo da mãe.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(d.email, 120))) return 'E-mail inválido.';
  const tel = onlyDigits(d.whatsapp);
  if (!(tel.length === 10 || tel.length === 11) || Number(tel.slice(0, 2)) < 11) return 'WhatsApp inválido.';
  if (!UF_CODES.includes(clean(d.naturalidade, 2))) return 'Escolha a naturalidade.';
  if (clean(d.cidadeNasc, 80).length < 2) return 'Informe a cidade onde nasceu.';
  if (onlyDigits(d.cep).length !== 8) return 'CEP inválido.';
  if (clean(d.endereco).length < 3 || !clean(d.numero) || clean(d.bairro).length < 2 || clean(d.cidade).length < 2) return 'Endereço incompleto.';
  if (!UF_CODES.includes(clean(d.uf, 2).toUpperCase())) return 'UF do endereço inválida.';
  if (clean(d.empresa).length < 2 || clean(d.cargo).length < 2) return 'Informe a empresa e o cargo.';
  if (money(d.renda) <= 0) return 'Informe a renda comprovada.';
  if (clean(d.carro1).length < 2) return 'Informe pelo menos um carro de interesse.';
  if (money(d.parcela) <= 0) return 'Informe a parcela esperada.';
  if (!String(d.entrada ?? '').trim()) return 'Informe a entrada.';
  if (!['SIM', 'NÃO'].includes(clean(d.cnh, 3))) return 'Informe se tem CNH.';
  if (!RESTRICAO.includes(clean(d.restricao, 10))) return 'Informe se tem restrição no nome.';
  if (!PRAZOS.includes(clean(d.prazo, 30))) return 'Informe quando pretende comprar.';
  return '';
}

function montarMensagem(d) {
  const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const carros = [d.carro1, d.carro2, d.carro3]
    .map(c => clean(c, 80))
    .filter(Boolean)
    .map((c, i) => `${i + 1}) ${esc(c)}`);
  const endereco = `${clean(d.endereco)}, nº ${clean(d.numero, 30)} – ${clean(d.bairro)} – ${clean(d.cidade)}/${clean(d.uf, 2).toUpperCase()} – CEP ${fmtCep(d.cep)}`;

  return [
    '🚗 <b>NOVO LEAD – OPERADOR DE CRÉDITO SENNA MOTORS</b>',
    '',
    `🧑‍💼 <b>Vendedor(a):</b> ${esc(clean(d.vendedor, 40))}`,
    '',
    `👤 <b>Nome:</b> ${esc(clean(d.nome))}`,
    `🪪 <b>CPF:</b> ${esc(fmtCpf(d.cpf))}`,
    `🎂 <b>Nascimento:</b> ${esc(fmtData(d.nascimento))}`,
    `🪪 <b>RG:</b> ${esc(clean(d.rg, 20))} – ${esc(clean(d.rgUf, 2))}`,
    `👩 <b>Mãe:</b> ${esc(clean(d.mae))}`,
    `✉️ <b>E-mail:</b> ${esc(clean(d.email))}`,
    `📱 <b>WhatsApp:</b> ${esc(fmtTel(d.whatsapp))}`,
    `👉 https://wa.me/55${onlyDigits(d.whatsapp)}`,
    `🌎 <b>Naturalidade:</b> ${esc(clean(d.cidadeNasc, 80))}/${esc(clean(d.naturalidade, 2))}`,
    '',
    `📍 <b>Endereço:</b> ${esc(endereco)}`,
    '',
    `💼 <b>Empresa:</b> ${esc(clean(d.empresa))}`,
    `🧑‍💼 <b>Cargo:</b> ${esc(clean(d.cargo))}`,
    `💵 <b>Renda comprovada:</b> ${esc(brl(money(d.renda)))}`,
    '',
    '🚘 <b>Carros de interesse:</b>',
    ...carros,
    '',
    `💰 <b>Entrada:</b> ${esc(brl(money(d.entrada)))}`,
    `📆 <b>Parcela esperada:</b> ${esc(brl(money(d.parcela)))}`,
    `🪪 <b>CNH:</b> ${esc(clean(d.cnh, 3))}`,
    `⚠️ <b>Restrição no nome:</b> ${esc(clean(d.restricao, 10))}`,
    `⏱️ <b>Quer comprar:</b> ${esc(clean(d.prazo, 30))}`,
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

  const d = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot anti-robô: campo invisível que humano não preenche
  if (d.website) return res.status(200).json({ ok: true });

  const erro = validar(d);
  if (erro) return res.status(400).json({ error: erro });

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.error('Variáveis TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID não configuradas.');
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }

  try {
    const r = await enviarTelegram(montarMensagem(d));
    if (!r.ok) {
      console.error('Falha no Telegram:', r.status, await r.text());
      return res.status(502).json({ error: 'Não foi possível avisar a equipe agora. Tente novamente em instantes.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro ao enviar:', e && e.message);
    return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  }
};

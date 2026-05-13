/*
RADAR COPA 2026 — INTEGRAÇÃO DOS SITES PARCEIROS
Use este arquivo dentro de cada site parceiro:
- Gabarito Max
- DB ENEM
- Matriz Educacional
- Radar Conservador

Como instalar:
1. Copie este arquivo para a raiz do site parceiro.
2. Antes de </body>, coloque:
   <script src="radar-copa-parceiro.js"></script>

Para registrar simulado finalizado, chame no final do simulado:
RadarCopaParceiro.registrarSimulado({
  idSimulado: "simulado-01",
  total: 10,
  acertos: acertos,
  finalizado: true
});
*/

(function(){
  const SUPABASE_URL = "https://cxxlsapgodwckrhkbwpo.supabase.co";
  const SUPABASE_KEY = "sb_publishable_myoZQmhn0sAEgkvLkRGoFQ_u18JJjPm";

  const KEY_RECOMPENSAS = "radar_copa_recompensas_pendentes";
  const KEY_TORCEDOR = "radar_copa_codigo_torcedor";
  const KEY_MISSOES = "radar_copa_missoes_parceiros";

  const CONFIG_POR_URL = [
    { trecho: "oficial-portal-gabaritomax", parceiro: "gabarito_max", nome: "Gabarito Max" },
    { trecho: "DB-ENEM", parceiro: "db_enem", nome: "DB ENEM" },
    { trecho: "matriz-educacional", parceiro: "matriz_educacional", nome: "Matriz Educacional" },
    { trecho: "radar-conservador-brasil", parceiro: "radar_conservador", nome: "Radar Conservador" }
  ];

  function detectarParceiro() {
    const href = location.href;
    return CONFIG_POR_URL.find(p => href.includes(p.trecho)) || {
      parceiro: "parceiro_radar_copa",
      nome: "Parceiro Radar Copa"
    };
  }

  const parceiroAtual = detectarParceiro();

  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function gerarCodigoTorcedor() {
    let codigo = localStorage.getItem(KEY_TORCEDOR);
    if (!codigo) {
      codigo = "TORCEDOR-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString().slice(-4);
      localStorage.setItem(KEY_TORCEDOR, codigo);
    }
    return codigo;
  }

  function lerLista(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }

  function salvarLista(key, lista) {
    localStorage.setItem(key, JSON.stringify(lista || []));
  }

  function missaoKey(tipo, idSimulado) {
    return [parceiroAtual.parceiro, tipo, idSimulado || "geral", hoje()].join("__");
  }

  function melhorRecompensaAnterior(idSimulado) {
    const missoes = lerLista(KEY_MISSOES);
    const prefixo = [parceiroAtual.parceiro, "simulado", idSimulado || "geral", hoje()].join("__");
    const encontrada = missoes.find(m => m.key === prefixo);
    return encontrada ? Number(encontrada.totalFinal || 0) : 0;
  }

  function salvarMelhorRecompensa(idSimulado, totalFinal) {
    const missoes = lerLista(KEY_MISSOES);
    const key = [parceiroAtual.parceiro, "simulado", idSimulado || "geral", hoje()].join("__");
    const i = missoes.findIndex(m => m.key === key);
    if (i >= 0) {
      missoes[i].totalFinal = totalFinal;
      missoes[i].atualizadoEm = new Date().toISOString();
    } else {
      missoes.push({ key, totalFinal, criadoEm: new Date().toISOString() });
    }
    salvarLista(KEY_MISSOES, missoes);
  }

  function adicionarRecompensa({tipo, descricao, figurinhas = 0, pacotes = 0, idSimulado = ""}) {
    const lista = lerLista(KEY_RECOMPENSAS);
    const id = [
      parceiroAtual.parceiro,
      tipo,
      idSimulado || "geral",
      Date.now(),
      Math.random().toString(36).slice(2, 6)
    ].join("__");

    const item = {
      id,
      parceiro: parceiroAtual.parceiro,
      parceiroNome: parceiroAtual.nome,
      tipo,
      descricao,
      figurinhas: Number(figurinhas || 0),
      pacotes: Number(pacotes || 0),
      codigoTorcedor: gerarCodigoTorcedor(),
      origemUrl: location.href,
      criadoEm: new Date().toISOString(),
      processado: false
    };

    lista.push(item);
    salvarLista(KEY_RECOMPENSAS, lista);
    registrarSupabase(item);
    mostrarAviso(item);
    return item;
  }

  async function registrarSupabase(item) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/missoes_copa", {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          codigo_torcedor: item.codigoTorcedor,
          missao: item.tipo,
          descricao: item.descricao,
          status: "pendente_album",
          recompensa: item.figurinhas + (item.pacotes * 3),
          origem: item.parceiro
        })
      });
    } catch (e) {
      console.warn("Radar Copa: recompensa salva localmente, Supabase não confirmou.", e);
    }
  }

  function mostrarAviso(item) {
    const antigo = document.getElementById("radar-copa-recompensa-aviso");
    if (antigo) antigo.remove();

    const total = item.figurinhas + (item.pacotes * 3);
    const div = document.createElement("div");
    div.id = "radar-copa-recompensa-aviso";
    div.innerHTML = `
      <div style="font-weight:900;font-size:16px;margin-bottom:5px;">🎁 Radar Copa</div>
      <div>${item.descricao}</div>
      <div style="margin-top:8px;font-weight:900;color:#ffd54a;">+${total} figurinha(s) para resgatar no álbum</div>
      <a href="https://dev-orient-social.github.io/radar-copa-2026-com-album/album/index.html" style="display:inline-block;margin-top:10px;background:#ffd54a;color:#111827;padding:8px 12px;border-radius:999px;text-decoration:none;font-weight:900;">Abrir álbum</a>
    `;
    div.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:999999;max-width:330px;background:linear-gradient(145deg,#06142e,#0b3d91);color:#fff;border:2px solid #ffd54a;border-radius:18px;padding:16px;box-shadow:0 16px 38px rgba(0,0,0,.35);font-family:Arial,sans-serif;";
    document.body.appendChild(div);

    setTimeout(() => {
      const el = document.getElementById("radar-copa-recompensa-aviso");
      if (el) el.remove();
    }, 12000);
  }

  function premiarAcesso() {
    const params = new URLSearchParams(location.search);
    const origem = params.get("origem") || "";
    if (!origem.includes("radar_copa")) return;

    const key = missaoKey("acesso_site", "acesso");
    const missoes = lerLista(KEY_MISSOES);
    if (missoes.some(m => m.key === key)) return;

    missoes.push({ key, totalFinal: 1, criadoEm: new Date().toISOString() });
    salvarLista(KEY_MISSOES, missoes);

    adicionarRecompensa({
      tipo: "acesso_site",
      descricao: `Você acessou ${parceiroAtual.nome} pelo Radar Copa.`,
      figurinhas: 1,
      idSimulado: "acesso"
    });
  }

  window.RadarCopaParceiro = {
    adicionarRecompensa,
    premiarAcesso,
    registrarSimulado({idSimulado = "simulado", total = 10, acertos = 0, finalizado = true} = {}) {
      if (!finalizado) return;

      total = Number(total || 0);
      acertos = Number(acertos || 0);

      let totalFinal = 1;
      let tipo = "simulado_aberto";
      let texto = `Você participou de um simulado em ${parceiroAtual.nome}.`;

      if (total > 0 && acertos >= total) {
        totalFinal = 5;
        tipo = "simulado_gabaritado";
        texto = `Você gabaritou um simulado em ${parceiroAtual.nome}.`;
      } else if (total > 0 && acertos >= Math.ceil(total / 2)) {
        totalFinal = 3;
        tipo = "simulado_metade";
        texto = `Você acertou pelo menos metade do simulado em ${parceiroAtual.nome}.`;
      }

      const anterior = melhorRecompensaAnterior(idSimulado);
      const delta = Math.max(0, totalFinal - anterior);

      if (delta <= 0) {
        mostrarAviso({
          descricao: "Sua melhor recompensa desse simulado já foi registrada hoje.",
          figurinhas: 0,
          pacotes: 0
        });
        return;
      }

      salvarMelhorRecompensa(idSimulado, totalFinal);

      adicionarRecompensa({
        tipo,
        descricao: texto,
        figurinhas: delta,
        idSimulado
      });
    },
    registrarPremium({pacotes = 10, descricao = "Compra premium confirmada. Bônus liberado no Radar Copa."} = {}) {
      adicionarRecompensa({
        tipo: "premium_10_pacotes",
        descricao,
        pacotes: Number(pacotes || 10),
        idSimulado: "premium"
      });
    }
  };

  document.addEventListener("DOMContentLoaded", premiarAcesso);
})();

// ===================================================
// SMARTBOT BOLIVIA - VERSIÓN ANTI BUCLE 2025
// ===================================================
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const TOKEN = process.env.WABA_TOKEN || process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PHONE_ID = process.env.WABA_PHONE_ID;
const GRAPH = "https://graph.facebook.com/v20.0";

// --- UTILIDAD PARA ENVIAR MENSAJES ---
async function sendWhatsApp(body) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log("WA:", res.status, JSON.stringify(data));
  return data;
}

async function sendText(to, text) {
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

async function sendButtons(to, text, buttons) {
  const safe = buttons.slice(0, 3);
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: safe.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

// --- ESTADOS EN MEMORIA ---
const state = new Map();
const setState = (to, data) => state.set(to, { ...(state.get(to) || {}), ...data });
const getState = (to) => state.get(to) || {};
const clearState = (to) => state.delete(to);

// --- MENÚ PRINCIPAL ---
async function sendMainMenu(to) {
  return sendButtons(
    to,
    "🤖 *Bienvenido a SmartBot Bolivia*\nDescubre cómo la IA puede transformar tu negocio.\n\nSelecciona una opción:",
    [
      { id: "MENU_PLANES", title: "📦 Planes" },
      { id: "MENU_DEMOS", title: "🎬 Demos" },
      { id: "MENU_ASESOR", title: "🧑‍💼 Asesor" },
    ]
  );
}

// --- PLANES ---
async function sendPlanes(to) {
  return sendButtons(
    to,
    "📦 *Planes SmartBot Bolivia*",
    [
      { id: "PLAN_BASIC", title: "Básico" },
      { id: "PLAN_PRO", title: "Pro" },
      { id: "PLAN_PREMIUM", title: "Premium" },
    ]
  );
}

async function replyPlan(to, id) {
  const plans = {
    PLAN_BASIC:
      "🔹 *Plan Básico*\n• Respuestas automáticas 24/7\n• Menús con botones\n• Integración WhatsApp Business\n💰 Desde 150 Bs/mes.",
    PLAN_PRO:
      "🔷 *Plan Pro*\n• IA con GPT integrada\n• Flujos personalizados\n• 5000 interacciones/mes\n💰 Desde 300 Bs/mes.",
    PLAN_PREMIUM:
      "🔶 *Plan Premium*\n• IA avanzada ilimitada\n• CRM + Pagos QR + integraciones\n💰 Precio personalizado.",
  };
  return sendText(to, plans[id]);
}

// --- DEMOS ---
async function sendDemos(to) {
  return sendButtons(
    to,
    "🎬 *Demos disponibles:*\n• FoodBot 🍔 — pedidos y pago QR\n• MediBot 🏥 — citas médicas\n• LegalBot GPT ⚖️ — consultas legales con IA",
    [
      { id: "DEMO_FOOD", title: "🍔 FoodBot" },
      { id: "DEMO_MEDI", title: "🏥 MediBot" },
      { id: "DEMO_LEGAL", title: "⚖️ LegalBot GPT" },
    ]
  );
}

// --- WEBHOOK VERIFY ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
});

// --- WEBHOOK POST ---
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!change?.messages || change.messages.length === 0) return res.sendStatus(200);

    const msg = change.messages[0];

    // 🔥 FILTRO ANTI BUCLE 🔥
    if (msg.statuses || msg.type === "unsupported") return res.sendStatus(200);
    if (msg.from === change.metadata?.phone_number_id) return res.sendStatus(200);
    if (msg.id && msg.id.startsWith("wamid.")) {
      if (msg.id.includes("echo") || msg.id.includes("wamid")) return res.sendStatus(200);
    }

    const from = msg.from;
    const type = msg.type;

    // BOTONES
    if (type === "interactive") {
      const id = msg.interactive?.button_reply?.id;
      const st = getState(from);

      if (id.startsWith("MENU_")) {
        if (id === "MENU_PLANES") return sendPlanes(from);
        if (id === "MENU_DEMOS") return sendDemos(from);
        if (id === "MENU_ASESOR")
          return sendText(from, "📞 Contacta con un asesor en *+591 72296430*.");
      }

      if (id.startsWith("PLAN_")) return replyPlan(from, id);

      // --- Demos ---
      if (id === "DEMO_FOOD") {
        setState(from, { demo: "food" });
        return sendButtons(from, "🍔 *FoodBot*\n¿Qué deseas hacer?", [
          { id: "FOOD_MENU", title: "Ver menú" },
          { id: "FOOD_PEDIDO", title: "Hacer pedido" },
        ]);
      }

      if (id === "FOOD_MENU") {
        setState(from, { demo: "food", step: "pedido" });
        return sendText(
          from,
          "📋 *Menú del día*\n• Salteña de pollo — 8 Bs\n• Hamburguesa — 25 Bs\n• Jugo de maracuyá — 10 Bs\n\n✍️ Escribe tu pedido."
        );
      }

      if (id === "FOOD_OK") {
        const st = getState(from);
        sendText(from, `✅ Pedido confirmado: ${st.pedido}`);
        clearState(from);
        return;
      }

      if (id === "DEMO_MEDI") {
        setState(from, { demo: "medi", step: "area" });
        return sendText(from, "🏥 *MediBot*\nIndica especialidad (ej.: Odontología).");
      }

      if (id === "MEDI_OK") {
        const st = getState(from);
        sendText(from, `✅ Cita confirmada en *${st.area}* el *${st.fecha}*.`);
        clearState(from);
        return;
      }

      if (id === "DEMO_LEGAL") {
        setState(from, { demo: "legal" });
        return sendText(
          from,
          "⚖️ *LegalBot GPT*\nEscribe tu consulta legal.\nEjemplo: “¿Qué pasa si me despiden sin causa?”"
        );
      }
    }

    // TEXTO
    if (type === "text") {
      const txt = msg.text.body.trim().toLowerCase();
      const st = getState(from);

      if (["hola", "menu", "inicio"].includes(txt)) return sendMainMenu(from);
      if (txt === "planes") return sendPlanes(from);
      if (txt === "demos") return sendDemos(from);

      // FOODBOT
      if (st.demo === "food" && st.step === "pedido") {
        setState(from, { step: "confirmar", pedido: msg.text.body });
        return sendButtons(from, `Confirmar pedido: "${msg.text.body}"`, [
          { id: "FOOD_OK", title: "OK" },
        ]);
      }

      // MEDIBOT
      if (st.demo === "medi") {
        if (st.step === "area") {
          setState(from, { step: "fecha", area: msg.text.body });
          return sendText(from, "📅 Indica la fecha (ej.: 21/10 15:00).");
        }
        if (st.step === "fecha") {
          setState(from, { step: "confirmar", fecha: msg.text.body });
          return sendButtons(from, `Confirmar cita en *${st.area}* el *${msg.text.body}*`, [
            { id: "MEDI_OK", title: "OK" },
          ]);
        }
      }

      // LEGALBOT
      if (st.demo === "legal") {
        return sendText(
          from,
          `🧠 *Respuesta IA simulada:*\nTu consulta: "${msg.text.body}"\n\n👉 En Plan Pro o Premium, LegalBot usa GPT para redactar documentos conforme a ley boliviana.`
        );
      }

      // fallback
      return sendText(from, "No entendí. Escribe *hola* para volver al menú principal.");
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Error general:", e);
    res.sendStatus(200);
  }
});

// --- HEALTHCHECK ---
app.get("/", (_, res) => res.send("✅ SmartBot Bolivia corriendo sin bucles"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SmartBot Bolivia activo en puerto ${PORT}`));

// server.js
// SmartBot Bolivia — Menú con botones (Planes + Bots + Asesor + Horarios)

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

// Fallback a node-fetch si tu runtime no trae fetch nativo
if (typeof fetch === "undefined") {
  global.fetch = (...args) =>
    import("node-fetch").then(({ default: f }) => f(...args));
}

const app = express();
app.use(express.json());

// Endpoint de WhatsApp
const WA_URL = `https://graph.facebook.com/v20.0/${process.env.WABA_PHONE_ID}/messages`;

// Utilidad para enviar mensajes a WhatsApp
async function waSend(payload) {
  const res = await fetch(WA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WABA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  // Log útil para depurar en Render -> Logs
  console.log("WA status:", res.status, "respuesta:", text);
  return { status: res.status, text };
}

/* ----------------------------- MENSAJES ----------------------------- */

// Menú principal
async function sendMainMenu(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "👋 ¡Hola! Bienvenido a *SmartBot Bolivia* 🇧🇴\n\n" +
          "Soy tu asistente virtual. Elige una opción para continuar 👇",
      },
      footer: { text: "SmartBot Bolivia — Automatiza tu negocio 24/7" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "MENU_PLANES", title: "⚙️ Planes SmartBot" } },
          { type: "reply", reply: { id: "MENU_BOTS", title: "🤖 Bots Personalizados" } },
          { type: "reply", reply: { id: "ASESOR", title: "💬 Hablar con Asesor" } },
          { type: "reply", reply: { id: "HORARIOS", title: "🕒 Horarios de Atención" } },
        ],
      },
    },
  });
}

// Submenú: Planes
async function sendPlanesMenu(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "💼 Nuestros *Planes SmartBot* se adaptan a tu negocio:\n\n" +
          "• 🌱 *Básico*: Respuestas preconfiguradas + FAQs simples.\n" +
          "• 🚀 *Pro*: IA GPT conversacional + 5.000 interacciones/mes + integraciones.\n" +
          "• 👑 *Premium*: Inteligencia avanzada ilimitada + flujos personalizados.\n\n" +
          "Elige un plan para ver detalles 👇",
      },
      footer: { text: "SmartBot Bolivia — Planes" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "PLAN_BASIC", title: "🌱 Plan Básico" } },
          { type: "reply", reply: { id: "PLAN_PRO", title: "🚀 Plan Pro" } },
          { type: "reply", reply: { id: "PLAN_PREMIUM", title: "👑 Plan Premium" } },
        ],
      },
    },
  });
}

// Detalles: Plan Básico
async function sendPlanBasic(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "🌱 *Plan Básico*\n\n" +
          "• Respuestas automáticas preconfiguradas (WhatsApp/Telegram)\n" +
          "• FAQs simples (preguntas frecuentes)\n" +
          "• Ideal para tiendas, servicios personales y pequeños negocios familiares\n\n" +
          "¿Deseas una demo o hablar con un asesor?",
      },
      footer: { text: "SmartBot Bolivia — Plan Básico" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_PLANES", title: "🔙 Volver a Planes" } },
          { type: "reply", reply: { id: "MENU_PRINCIPAL", title: "🏠 Menú Principal" } },
        ],
      },
    },
  });
}

// Detalles: Plan Pro
async function sendPlanPro(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "🚀 *Plan Pro*\n\n" +
          "• IA conversacional (GPT) para lenguaje natural\n" +
          "• Hasta *5.000* interacciones mensuales\n" +
          "• Integración con formularios y bases de datos\n" +
          "• Ideal para restaurantes medianos, estudios legales y clínicas pequeñas",
      },
      footer: { text: "SmartBot Bolivia — Plan Pro" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_PLANES", title: "🔙 Volver a Planes" } },
          { type: "reply", reply: { id: "MENU_PRINCIPAL", title: "🏠 Menú Principal" } },
        ],
      },
    },
  });
}

// Detalles: Plan Premium
async function sendPlanPremium(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "👑 *Plan Premium*\n\n" +
          "• Inteligencia avanzada *ilimitada*\n" +
          "• Flujos conversacionales 100% personalizados\n" +
          "• Integraciones (pagos, reservas, gestión interna)\n" +
          "• Ideal para clínicas grandes, cadenas gastronómicas e instituciones",
      },
      footer: { text: "SmartBot Bolivia — Plan Premium" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_PLANES", title: "🔙 Volver a Planes" } },
          { type: "reply", reply: { id: "MENU_PRINCIPAL", title: "🏠 Menú Principal" } },
        ],
      },
    },
  });
}

// Submenú: Bots Personalizados
async function sendBotsMenu(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "🤖 *Bots Personalizados listos para tu negocio:*\n\n" +
          "• ⚖️ *LegalBot*: Consultas 24/7, redacción de documentos según normativa boliviana, +5.000 interacciones.\n" +
          "• 🏥 *MediBot*: Orientación médica, gestión de pacientes, reservas y pagos QR.\n" +
          "• 🍔 *FoodBot*: Pedidos, reservas, pagos QR y delivery automático.\n\n" +
          "Elige uno para ver detalles 👇",
      },
      footer: { text: "SmartBot Bolivia — Bots Especializados" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "BOT_LEGAL", title: "⚖️ LegalBot" } },
          { type: "reply", reply: { id: "BOT_MEDI", title: "🏥 MediBot" } },
          { type: "reply", reply: { id: "BOT_FOOD", title: "🍔 FoodBot" } },
        ],
      },
    },
  });
}

// Detalles: LegalBot
async function sendBotLegal(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "⚖️ *LegalBot* — tu abogado virtual 24/7\n\n" +
          "• Basado 100% en normativa boliviana\n" +
          "• Redacción automática de documentos legales\n" +
          "• +5.000 interacciones configurables\n\n" +
          "Ideal para estudios jurídicos y consultoras.",
      },
      footer: { text: "SmartBot Bolivia — LegalBot" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "DEMO_LEGAL", title: "🧪 Solicitar Demo" } },
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_BOTS", title: "🔙 Volver a Bots" } },
        ],
      },
    },
  });
}

// Detalles: MediBot
async function sendBotMedi(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "🏥 *MediBot* — asistente médico inteligente\n\n" +
          "• Gestión de pacientes, reserva de citas y horarios\n" +
          "• Recordatorios y pagos por QR integrados\n" +
          "• Ideal para clínicas y consultorios privados",
      },
      footer: { text: "SmartBot Bolivia — MediBot" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "DEMO_MEDI", title: "🧪 Solicitar Demo" } },
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_BOTS", title: "🔙 Volver a Bots" } },
        ],
      },
    },
  });
}

// Detalles: FoodBot
async function sendBotFood(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "🍔 *FoodBot* — bot gastronómico completo\n\n" +
          "• Pedidos, reservas y pagos con QR\n" +
          "• Coordinación de delivery automática\n" +
          "• Ideal para cafés, restaurantes y food trucks",
      },
      footer: { text: "SmartBot Bolivia — FoodBot" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "DEMO_FOOD", title: "🧪 Solicitar Demo" } },
          { type: "reply", reply: { id: "ASESOR", title: "📞 Hablar con Asesor" } },
          { type: "reply", reply: { id: "MENU_BOTS", title: "🔙 Volver a Bots" } },
        ],
      },
    },
  });
}

// Horarios
async function sendHorarios(to) {
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body:
        "🕒 *Horarios de Atención*\n" +
        "Lun–Vie: 08:30–18:00\n" +
        "Sáb: 09:00–13:00\n\n" +
        "Puedes escribirnos en cualquier momento, el sistema responde 24/7.",
    },
  });
}

// Asesor humano
async function sendAsesor(to) {
  const phone = "+591 72296430";
  return waSend({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text:
          "👨‍💼 Un asesor te ayudará en minutos.\n" +
          `Puedes escribir o llamar al *${phone}*.`,
      },
      footer: { text: "SmartBot Bolivia — Asesor" },
      action: {
        buttons: [
          { type: "reply", reply: { id: "MENU_PRINCIPAL", title: "🏠 Menú Principal" } },
        ],
      },
    },
  });
}

/* ---------------------------- WEBHOOKS ---------------------------- */

// Verificación (GET)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Recepción de eventos (POST)
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];

    if (!msg) {
      return res.sendStatus(200);
    }

    const from = msg.from;

    // Detectar opción por botones interactivos
    let intentId = null;
    if (msg.type === "interactive") {
      const interactive = msg.interactive;
      if (interactive.type === "button_reply") {
        intentId = interactive.button_reply?.id;
      } else if (interactive.type === "list_reply") {
        intentId = interactive.list_reply?.id;
      }
    }

    // Texto libre (fallback)
    const text = (msg.text?.body || "").trim().toLowerCase();

    // Normalización de intenciones
    if (!intentId) {
      if (["hola", "menu", "inicio", "buenas", "start"].some(w => text.includes(w))) {
        intentId = "MENU_PRINCIPAL";
      } else if (text.includes("plan")) {
        intentId = "MENU_PLANES";
      } else if (text.includes("bot")) {
        intentId = "MENU_BOTS";
      } else if (text.includes("asesor")) {
        intentId = "ASESOR";
      } else if (text.includes("horario")) {
        intentId = "HORARIOS";
      }
    }

    // Enrutamiento
    switch (intentId) {
      // Menús
      case "MENU_PRINCIPAL":
        await sendMainMenu(from);
        break;
      case "MENU_PLANES":
        await sendPlanesMenu(from);
        break;
      case "MENU_BOTS":
        await sendBotsMenu(from);
        break;

      // Planes
      case "PLAN_BASIC":
        await sendPlanBasic(from);
        break;
      case "PLAN_PRO":
        await sendPlanPro(from);
        break;
      case "PLAN_PREMIUM":
        await sendPlanPremium(from);
        break;

      // Bots
      case "BOT_LEGAL":
        await sendBotLegal(from);
        break;
      case "BOT_MEDI":
        await sendBotMedi(from);
        break;
      case "BOT_FOOD":
        await sendBotFood(from);
        break;

      // Acciones comunes
      case "ASESOR":
        await sendAsesor(from);
        break;
      case "HORARIOS":
        await sendHorarios(from);
        break;

      // Demos (por ahora redirigimos al asesor)
      case "DEMO_LEGAL":
      case "DEMO_MEDI":
      case "DEMO_FOOD":
        await waSend({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body:
              "🧪 ¡Excelente! Para coordinar tu demo, un asesor te contactará en breve.\n" +
              "También puedes escribirnos al *+591 72296430*.",
          },
        });
        break;

      // Fallback
      default:
        await waSend({
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: {
            body:
              "🤖 No entendí tu pedido. Escribe *hola* para ver el menú o elige:\n" +
              "• *planes*  • *bots*  • *asesor*  • *horarios*",
          },
        });
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error en webhook:", err);
    res.sendStatus(200);
  }
});

/* ----------------------------- SERVER ----------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ SmartBot Bolivia ejecutándose en puerto ${PORT}`)
);

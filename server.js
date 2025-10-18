import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import "dotenv/config";

const app = express();
app.use(bodyParser.json());

// === ENV ===
const WABA_TOKEN       = process.env.WABA_TOKEN;        // Token de acceso
const WABA_PHONE_ID    = process.env.WABA_PHONE_ID;     // Phone Number ID
const VERIFY_TOKEN     = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PORT             = process.env.PORT || 10000;

// === Helpers ===
const wa = axios.create({
  baseURL: `https://graph.facebook.com/v19.0/${WABA_PHONE_ID}`,
  headers: {
    Authorization: `Bearer ${WABA_TOKEN}`,
    "Content-Type": "application/json"
  }
});

async function sendText(to, text) {
  return wa.post(`/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  });
}

// ===== Menú principal como LISTA (sin límite de 3 botones) =====
async function sendMainMenu(to) {
  return wa.post(`/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "🤖 SmartBot Bolivia" },
      body: {
        text:
          "¡Hola! Soy tu asistente. Elige una opción del menú 👇"
      },
      footer: { text: "Automatiza. Ahorra tiempo. Vende más." },
      action: {
        button: "Ver opciones",
        sections: [
          {
            title: "Categorías",
            rows: [
              {
                id: "MENU_PLANES",
                title: "Planes",
                description: "Básico, Pro y Premium"
              },
              {
                id: "MENU_BOTS",
                title: "Bots listos",
                description: "LegalBot, MediBot, FoodBot"
              },
              {
                id: "MENU_ASESOR",
                title: "Hablar con un asesor",
                description: "Atención comercial"
              },
              {
                id: "MENU_HORARIOS",
                title: "Horarios de atención",
                description: "Días y horas disponibles"
              }
            ]
          }
        ]
      }
    }
  });
}

// ===== Submenú de planes (LISTA) =====
async function sendPlanesMenu(to) {
  return wa.post(`/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "📦 Planes SmartBot Bolivia" },
      body: {
        text: "Selecciona un plan para ver sus características."
      },
      action: {
        button: "Ver planes",
        sections: [
          {
            title: "Opciones",
            rows: [
              { id: "PLAN_BASICO", title: "Básico", description: "Respuestas preconfiguradas" },
              { id: "PLAN_PRO", title: "Pro", description: "Incluye IA conversacional (GPT)" },
              { id: "PLAN_PREMIUM", title: "Premium", description: "IA avanzada + Flujos a medida" }
            ]
          }
        ]
      }
    }
  });
}

// ===== Bots listos (LISTA) =====
async function sendBotsList(to) {
  return wa.post(`/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "🧰 Bots listos para tu negocio" },
      body: { text: "Elige un bot para ver lo que incluye." },
      action: {
        button: "Ver bots",
        sections: [
          {
            title: "Modelos disponibles",
            rows: [
              { id: "BOT_LEGAL", title: "⚖️ LegalBot", description: "Consultas 24/7 • Docs según norma BO" },
              { id: "BOT_MEDI", title: "🩺 MediBot", description: "Pacientes, citas, historial, pagos QR" },
              { id: "BOT_FOOD", title: "🍽️ FoodBot", description: "Pedidos, reservas, QR y delivery" }
            ]
          }
        ]
      }
    }
  });
}

// ===== Respuestas de detalle =====
async function replyPlanBasico(to) {
  return sendText(
    to,
    "✅ *Plan Básico* — ideal para restaurantes pequeños, tiendas locales y servicios personales.\n\n" +
    "• Respuestas automáticas preconfiguradas (FAQ simples)\n" +
    "• WhatsApp y/o Telegram\n" +
    "• Activación rápida con *plantillas listas*\n\n" +
    "¿Quieres una demo o contratar? Escribe *asesor*."
  );
}

async function replyPlanPro(to) {
  return sendText(
    to,
    "🚀 *Plan Pro (con IA)* — perfecto para negocios en crecimiento.\n\n" +
    "• Bot con *GPT* (IA conversacional)\n" +
    "• Hasta *5.000* interacciones/mes\n" +
    "• Integración con formularios y bases de datos\n" +
    "• Plantillas de respuestas + entrenamiento con tus datos\n\n" +
    "¿Agendamos una demo? Escribe *asesor*."
  );
}

async function replyPlanPremium(to) {
  return sendText(
    to,
    "🏆 *Plan Premium* — para operaciones con volumen o complejidad.\n\n" +
    "• IA avanzada *ilimitada*\n" +
    "• Flujos conversacionales *a medida*\n" +
    "• Analítica y reportes\n" +
    "• Pagos QR y automatizaciones\n\n" +
    "¿Quieres una propuesta personalizada? Escribe *asesor*."
  );
}

async function replyLegalBot(to) {
  return sendText(
    to,
    "⚖️ *LegalBot* — Responde *consultas 24/7* con IA personalizada.\n" +
    "• Enfocado 100% en *normativa boliviana*\n" +
    "• Redacción de documentos conforme a ley\n" +
    "• Escalable a +5000 consultas/mes\n\n" +
    "¿Deseas ver un caso real? Escribe *asesor*."
  );
}

async function replyMediBot(to) {
  return sendText(
    to,
    "🩺 *MediBot* — Orientación médica y *gestión de pacientes*.\n" +
    "• Agenda de *citas* y horarios\n" +
    "• Fichas e historial básico\n" +
    "• *Pagos QR* y recordatorios automáticos\n\n" +
    "¿Quieres probarlo? Escribe *asesor*."
  );
}

async function replyFoodBot(to) {
  return sendText(
    to,
    "🍽️ *FoodBot* — Pedidos, reservas y *delivery* totalmente automatizado.\n" +
    "• Gestión de pedidos y menús\n" +
    "• Reservas por WhatsApp\n" +
    "• *Pagos QR* y estado del envío\n\n" +
    "¿Te muestro una demo? Escribe *asesor*."
  );
}

async function replyAsesor(to) {
  return sendText(
    to,
    "👤 *Asesor comercial*\n" +
    "Escríbenos o llama al *+591 72296430*.\n" +
    "También puedes enviar la palabra *menu* para volver al inicio."
  );
}

async function replyHorarios(to) {
  return sendText(
    to,
    "🕒 *Horarios de atención*\n" +
    "Lunes a Viernes: 09:00–18:00\n" +
    "Sábados: 09:00–13:00\n" +
    "Domingos y feriados: atención por WhatsApp."
  );
}

// ===== Webhook Verify (GET) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ===== Webhook Receiver (POST) =====
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const from = message?.from;

    if (!message || !from) {
      return res.sendStatus(200);
    }

    // 1) Mensajes de texto
    if (message.type === "text") {
      const txt = (message.text?.body || "").trim().toLowerCase();
      if (["hola", "menu", "empezar", "inicio"].includes(txt)) {
        await sendMainMenu(from);
      } else if (txt.includes("asesor")) {
        await replyAsesor(from);
      } else if (txt.includes("horario")) {
        await replyHorarios(from);
      } else {
        await sendText(from, "Te envié el menú para continuar 👇");
        await sendMainMenu(from);
      }
    }

    // 2) Respuestas interactivas (lista o botones)
    if (message.type === "interactive") {
      const i = message.interactive;

      // a) List reply
      if (i.type === "list_reply") {
        const id = i.list_reply?.id || "";

        switch (id) {
          case "MENU_PLANES":
            await sendPlanesMenu(from);
            break;

          case "MENU_BOTS":
            await sendBotsList(from);
            break;

          case "MENU_ASESOR":
            await replyAsesor(from);
            break;

          case "MENU_HORARIOS":
            await replyHorarios(from);
            break;

          // Planes
          case "PLAN_BASICO":
            await replyPlanBasico(from);
            break;
          case "PLAN_PRO":
            await replyPlanPro(from);
            break;
          case "PLAN_PREMIUM":
            await replyPlanPremium(from);
            break;

          // Bots listos
          case "BOT_LEGAL":
            await replyLegalBot(from);
            break;
          case "BOT_MEDI":
            await replyMediBot(from);
            break;
          case "BOT_FOOD":
            await replyFoodBot(from);
            break;

          default:
            await sendMainMenu(from);
        }
      }

      // b) Button reply (si más adelante usas botones)
      if (i.type === "button_reply") {
        const id = i.button_reply?.id || "";
        if (id === "VOLVER_MENU") await sendMainMenu(from);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("webhook error:", err?.response?.data || err.message);
    res.sendStatus(200);
  }
});

// Healthcheck
app.get("/", (_, res) => res.status(200).send("OK"));

// Start
app.listen(PORT, () => {
  console.log(`SmartBot Bolivia ejecutándose en puerto ${PORT}`);
});

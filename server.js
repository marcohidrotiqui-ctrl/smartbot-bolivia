// =======================
// SmartBot Bolivia - Server.js
// =======================
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// --- CONFIGURACIONES GLOBALES ---
const TOKEN = process.env.WABA_TOKEN || process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PHONE_ID = process.env.WABA_PHONE_ID;
const GRAPH = "https://graph.facebook.com/v20.0";

// --- UTILIDADES DE ENVÍO ---
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
  // Máximo 3 botones (regla de la API)
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

async function sendList(to, header, body, footer, rows) {
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      footer: { text: footer },
      action: {
        button: "Ver opciones",
        sections: [
          {
            title: "Planes disponibles",
            rows: rows.map((r) => ({
              id: r.id,
              title: r.title,
              description: r.description,
            })),
          },
        ],
      },
    },
  });
}

// --- SALUDO PRINCIPAL ---
async function sendMainMenu(to) {
  return sendButtons(
    to,
    "🤖 *Bienvenido a SmartBot Bolivia*\n" +
      "Descubre cómo la IA puede transformar tu negocio.\n\n" +
      "Selecciona una opción:",
    [
      { id: "MENU_PLANES", title: "📦 Planes" },
      { id: "MENU_DEMOS", title: "🎬 Demos" },
      { id: "MENU_ASESOR", title: "🧑‍💼 Asesor" },
    ]
  );
}

// --- PLANES ---
async function sendPlanesList(to) {
  return sendList(
    to,
    "📦 *Planes SmartBot Bolivia*",
    "Selecciona un plan para conocer sus características:",
    "Básico | Pro | Premium",
    [
      {
        id: "PLAN_BASIC",
        title: "Plan Básico",
        description: "Automatización simple y respuestas rápidas",
      },
      {
        id: "PLAN_PRO",
        title: "Plan Pro",
        description: "IA integrada con GPT y funciones avanzadas",
      },
      {
        id: "PLAN_PREMIUM",
        title: "Plan Premium",
        description: "Personalización total + IA ilimitada",
      },
    ]
  );
}

async function replyPlan(to, plan) {
  if (plan === "basic")
    return sendText(
      to,
      "🔹 *Plan Básico*\n" +
        "• Respuestas automáticas 24/7\n" +
        "• Menús interactivos con botones\n" +
        "• Integración WhatsApp Business API\n" +
        "👔 Ideal para: restaurantes, tiendas, servicios personales.\n\n" +
        "💰 Precio: desde 150 Bs/mes."
    );

  if (plan === "pro")
    return sendText(
      to,
      "🔷 *Plan Pro*\n" +
        "• IA con GPT (consultas inteligentes)\n" +
        "• Flujos personalizados y almacenamiento de datos\n" +
        "• Hasta 5.000 interacciones mensuales\n" +
        "🍽️⚖️ Ideal para: clínicas, estudios legales, negocios medianos.\n\n" +
        "💰 Precio: desde 300 Bs/mes."
    );

  if (plan === "premium")
    return sendText(
      to,
      "🔶 *Plan Premium*\n" +
        "• IA avanzada ilimitada (GPT + API externas)\n" +
        "• Diseño de flujos empresariales + CRM + pagos QR\n" +
        "• Integraciones completas a medida\n" +
        "🏢 Ideal para: empresas grandes y franquicias.\n\n" +
        "💰 Precio: personalizado según proyecto."
    );
}

// --- DEMOS ---
async function sendDemosMenu(to) {
  return sendButtons(
    to,
    "🎬 *Demos disponibles:*\n" +
      "• FoodBot 🍔 — pedidos y pago QR\n" +
      "• MediBot 🏥 — citas y orientación médica\n" +
      "• LegalBot GPT ⚖️ — consultas legales con IA\n\n" +
      "Selecciona una demo para probar:",
    [
      { id: "DEMO_FOOD", title: "🍔 FoodBot" },
      { id: "DEMO_MEDI", title: "🏥 MediBot" },
      { id: "DEMO_LEGAL", title: "⚖️ LegalBot GPT" },
    ]
  );
}

// --- ESTADOS EN MEMORIA ---
const state = new Map();
const setState = (to, data) => state.set(to, { ...(state.get(to) || {}), ...data });
const getState = (to) => state.get(to) || {};
const clearState = (to) => state.delete(to);

// --- WEBHOOK VERIFY ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  res.sendStatus(403);
});

// --- WEBHOOK RECEIVE ---
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const msg = entry?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const type = msg.type;

    // --- MENSAJES INTERACTIVOS ---
    if (type === "interactive") {
      const id = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;

      // Menú principal
      if (id === "MENU_PLANES") return await sendPlanesList(from);
      if (id === "MENU_DEMOS") return await sendDemosMenu(from);
      if (id === "MENU_ASESOR")
        return await sendText(from, "🧑‍💼 Nuestro asesor te atiende en *+591 72296430*.");

      // Planes
      if (id === "PLAN_BASIC") return await replyPlan(from, "basic");
      if (id === "PLAN_PRO") return await replyPlan(from, "pro");
      if (id === "PLAN_PREMIUM") return await replyPlan(from, "premium");

      // Demos
      if (id === "DEMO_FOOD") {
        setState(from, { demo: "food", step: "pedido" });
        return await sendText(from, "🍔 *FoodBot*\nEscribe tu pedido (ej.: 2 salteñas de pollo y 1 jugo).");
      }
      if (id === "DEMO_MEDI") {
        setState(from, { demo: "medi", step: "area" });
        return await sendText(from, "🏥 *MediBot*\nIndica especialidad (ej.: Odontología, Medicina general).");
      }
      if (id === "DEMO_LEGAL") {
        setState(from, { demo: "legal" });
        return await sendText(
          from,
          "⚖️ *LegalBot GPT (Simulado)*\nPuedes preguntar: “¿Qué pasa si me despiden sin causa?” o “modelo de contrato de alquiler”."
        );
      }

      // Confirmaciones
      if (id === "FOOD_OK") {
        const st = getState(from);
        await sendText(from, `✅ Pedido confirmado: "${st.pedido}"\nPronto recibirás tu pedido. ¡Gracias!`);
        clearState(from);
        return;
      }
      if (id === "FOOD_PAGAR") {
        const st = getState(from);
        await sendText(from, `💳 Paga tu pedido: https://pagos.smartbot-bo.com/qr?ref=${encodeURIComponent(st.pedido)}`);
        clearState(from);
        return;
      }
      if (id === "MEDI_OK") {
        const st = getState(from);
        await sendText(from, `✅ Cita confirmada en *${st.area}* el *${st.fecha}*. ¡Te esperamos!`);
        clearState(from);
        return;
      }
      if (id === "MEDI_EDIT") {
        setState(from, { demo: "medi", step: "area" });
        return await sendText(from, "Escribe nuevamente la especialidad para reagendar.");
      }
    }

    // --- MENSAJES DE TEXTO ---
    if (type === "text") {
      const txtRaw = msg.text.body.trim();
      const txt = txtRaw.toLowerCase();
      const st = getState(from);

      // Comandos rápidos / saludo
      if (["hola", "menu", "inicio", "start", "smartbot"].includes(txt)) return await sendMainMenu(from);
      if (txt === "planes") return await sendPlanesList(from);
      if (txt === "demos") return await sendDemosMenu(from);

      // FoodBot
      if (st.demo === "food") {
        if (st.step === "pedido") {
          setState(from, { step: "confirmar", pedido: txtRaw });
          return await sendButtons(from, `¿Confirmas este pedido?\n"${txtRaw}"`, [
            { id: "FOOD_OK", title: "OK" },
            { id: "FOOD_PAGAR", title: "PAGAR" },
          ]);
        }
      }

      // MediBot
      if (st.demo === "medi") {
        if (st.step === "area") {
          setState(from, { step: "fecha", area: txtRaw });
          return await sendText(from, "📅 Indica la fecha y hora de la cita (ej.: 22/10 15:00).");
        }
        if (st.step === "fecha") {
          setState(from, { step: "confirmar", fecha: txtRaw });
          return await sendButtons(from, `Confirmar cita en *${st.area}* el *${txtRaw}*`, [
            { id: "MEDI_OK", title: "OK" },
            { id: "MEDI_EDIT", title: "Editar" },
          ]);
        }
      }

      // LegalBot (demo IA)
      if (st.demo === "legal") {
        return await sendText(
          from,
          `🧠 *LegalBot IA (demo)*\nTu consulta: "${txtRaw}"\n\n` +
            "Respuesta ejemplo:\nSegún la normativa laboral boliviana, el despido sin causa da derecho a indemnización más beneficios sociales. " +
            "Para un documento, el Plan Pro/Premium integra GPT con redacción conforme a ley."
        );
      }

      // Fallback
      return await sendMainMenu(from);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err);
    res.sendStatus(200);
  }
});

// --- HEALTHCHECK ---
app.get("/", (req, res) => res.send("✅ SmartBot Bolivia corriendo correctamente."));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SmartBot Bolivia activo en puerto ${PORT}`));

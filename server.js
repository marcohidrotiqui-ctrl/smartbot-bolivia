// ===================================================
// SMARTBOT BOLIVIA - Versión estable Anti-bucle
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

// ---------------- Utilidades de envío ----------------
async function sendWhatsApp(body) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
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
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

// ---------------- Estado en memoria ----------------
const state = new Map();
const setState = (to, data) => state.set(to, { ...(state.get(to) || {}), ...data });
const getState = (to) => state.get(to) || {};
const clearState = (to) => state.delete(to);

// ---------------- Menús ----------------
async function sendMainMenu(to) {
  return sendButtons(
    to,
    "🤖 *Bienvenido a SmartBot Bolivia*\nSelecciona una opción:",
    [
      { id: "MENU_PLANES", title: "📦 Planes" },
      { id: "MENU_DEMOS",  title: "🎬 Demos"  },
      { id: "MENU_ASESOR", title: "🧑‍💼 Asesor" },
    ]
  );
}

async function sendPlanes(to) {
  return sendButtons(
    to,
    "📦 *Planes SmartBot Bolivia*",
    [
      { id: "PLAN_BASIC",   title: "Básico"   },
      { id: "PLAN_PRO",     title: "Pro"      },
      { id: "PLAN_PREMIUM", title: "Premium"  },
    ]
  );
}

async function replyPlan(to, id) {
  const plans = {
    PLAN_BASIC:
      "🔹 *Plan Básico*\n• Respuestas automáticas 24/7\n• Menús con botones\n• WhatsApp Business\n💰 Desde 150 Bs/mes.",
    PLAN_PRO:
      "🔷 *Plan Pro*\n• IA con GPT integrada\n• Flujos personalizados\n• 5000 interacciones/mes\n💰 Desde 300 Bs/mes.",
    PLAN_PREMIUM:
      "🔶 *Plan Premium*\n• IA avanzada ilimitada\n• CRM + Pagos QR + integraciones\n💰 Precio personalizado.",
  };
  return sendText(to, plans[id]);
}

async function sendDemos(to) {
  return sendButtons(
    to,
    "🎬 *Demos disponibles:*\n• FoodBot 🍔 — pedidos y pago QR\n• MediBot 🏥 — citas médicas\n• LegalBot GPT ⚖️ — consultas legales con IA",
    [
      { id: "DEMO_FOOD",  title: "🍔 FoodBot"  },
      { id: "DEMO_MEDI",  title: "🏥 MediBot"  },
      { id: "DEMO_LEGAL", title: "⚖️ LegalBot" },
    ]
  );
}

// ---------------- Webhook VERIFY ----------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// ---------------- Webhook POST ----------------
app.post("/webhook", async (req, res) => {
  try {
    const entry  = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    // 1) Filtra statuses (entregas/lecturas)
    if (change?.statuses) return res.sendStatus(200);

    const msg = change?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    // 2) Filtra ECHOS (mensajes que tu propio número se envió a sí mismo)
    const businessPhoneId = change?.metadata?.phone_number_id;
    if (msg.from === businessPhoneId) return res.sendStatus(200);

    const from = msg.from;
    const type = msg.type;

    // ---- Botones (interactive) ----
    if (type === "interactive") {
      const id = msg.interactive?.button_reply?.id;
      if (!id) return res.sendStatus(200);

      if (id.startsWith("MENU_")) {
        if (id === "MENU_PLANES")  return sendPlanes(from);
        if (id === "MENU_DEMOS")   return sendDemos(from);
        if (id === "MENU_ASESOR")  return sendText(from, "📞 Asesor: *+591 72296430*");
      }

      if (id.startsWith("PLAN_"))  return replyPlan(from, id);

      // ---- DEMOS ----
      if (id === "DEMO_FOOD") {
        setState(from, { demo: "food", step: "menu" });
        return sendButtons(from, "🍔 *FoodBot*\n¿Qué deseas hacer?", [
          { id: "FOOD_MENU",   title: "Ver menú"   },
          { id: "FOOD_PEDIDO", title: "Hacer pedido" },
        ]);
      }

      if (id === "FOOD_MENU") {
        setState(from, { demo: "food", step: "pedido" });
        return sendText(from,
          "📋 *Menú del día*\n• Salteña — 8 Bs\n• Hamburguesa — 25 Bs\n• Jugo — 10 Bs\n\n✍️ Escribe tu pedido."
        );
      }

      if (id === "FOOD_OK") {
        const st = getState(from);
        await sendText(from, `✅ Pedido confirmado: ${st.pedido}`);
        clearState(from);
        return;
      }

      if (id === "DEMO_MEDI") {
        setState(from, { demo: "medi", step: "area" });
        return sendText(from, "🏥 *MediBot*\nIndica especialidad (ej.: Odontología).");
      }

      if (id === "MEDI_OK") {
        const st = getState(from);
        await sendText(from, `✅ Cita confirmada en *${st.area}* el *${st.fecha}*.`);
        clearState(from);
        return;
      }

      if (id === "DEMO_LEGAL") {
        setState(from, { demo: "legal" });
        return sendText(
          from,
          "⚖️ *LegalBot GPT*\nEscribe tu consulta legal.\nEj.: “¿Qué pasa si me despiden sin causa?”"
        );
      }
      return res.sendStatus(200);
    }

    // ---- Texto ----
    if (type === "text") {
      const txt = msg.text?.body?.trim().toLowerCase() || "";
      const st = getState(from);

      if (["hola", "menu", "inicio", "hi", "hola!"].includes(txt)) return sendMainMenu(from);
      if (txt === "planes")  return sendPlanes(from);
      if (txt === "demos")   return sendDemos(from);

      // FoodBot
      if (st.demo === "food") {
        if (st.step === "pedido") {
          setState(from, { step: "confirmar", pedido: msg.text.body });
          return sendButtons(from, `Confirmar pedido: "${msg.text.body}"`, [
            { id: "FOOD_OK", title: "OK" },
          ]);
        }
        if (st.step === "menu") {
          // Si escribe algo estando en menu, muéstrale el menú y pasa a "pedido"
          setState(from, { step: "pedido" });
          return sendText(from,
            "📋 *Menú del día*\n• Salteña — 8 Bs\n• Hamburguesa — 25 Bs\n• Jugo — 10 Bs\n\n✍️ Escribe tu pedido."
          );
        }
      }

      // MediBot
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

      // LegalBot
      if (st.demo === "legal") {
        return sendText(
          from,
          `🧠 *Respuesta IA simulada*\nTu consulta: "${msg.text.body}"\n\n👉 En Plan Pro/Premium, LegalBot usa GPT para redactar documentos conforme a ley boliviana.`
        );
      }

      // fallback
      return sendText(from, "No te entendí. Escribe *hola* para ver el menú.");
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("❌ Error general:", e);
    return res.sendStatus(200);
  }
});

// Healthcheck
app.get("/", (_, res) => res.send("✅ SmartBot Bolivia OK"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SmartBot Bolivia activo en puerto ${PORT}`));

// ===================================================
// SMARTBOT BOLIVIA - Estable + Botón "Volver al menú"
// ===================================================
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const TOKEN        = process.env.WABA_TOKEN || process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PHONE_ID     = process.env.WABA_PHONE_ID;
const GRAPH        = "https://graph.facebook.com/v20.0";

// ---------------- Anti-duplicados (evita reintentos / bucles) ----------------
const seenIds = new Map(); // wamid -> timestamp
const SEEN_MAX = 500;
function remember(id) {
  seenIds.set(id, Date.now());
  if (seenIds.size > SEEN_MAX) {
    // elimina el más antiguo
    const oldestKey = [...seenIds.entries()].sort((a, b) => a[1] - b[1])[0][0];
    seenIds.delete(oldestKey);
  }
}
function alreadySeen(id) {
  return seenIds.has(id);
}

// ---------------- Utilidades de envío ----------------
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

function sendText(to, text) {
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

function sendButtons(to, text, buttons) {
  // WhatsApp permite 1-3 botones
  const safe = buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: { id: b.id, title: b.title },
  }));
  return sendWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: { buttons: safe },
    },
  });
}

// ---------------- Estado en memoria ----------------
const state = new Map();
const setState  = (to, data) => state.set(to, { ...(state.get(to) || {}), ...data });
const getState  = (to) => state.get(to) || {};
const clearState= (to) => state.delete(to);

// ---------------- Menús ----------------
function sendMainMenu(to) {
  clearState(to); // limpiar cualquier flujo previo
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

function sendPlanes(to) {
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

function replyPlan(to, id) {
  const plans = {
    PLAN_BASIC:
      "🔹 *Plan Básico*\n• Respuestas automáticas 24/7\n• Menús con botones\n• WhatsApp Business\n💰 Desde 150 Bs/mes.",
    PLAN_PRO:
      "🔷 *Plan Pro*\n• IA con GPT integrada\n• Flujos personalizados\n• Hasta 5.000 interacciones/mes\n💰 Desde 300 Bs/mes.",
    PLAN_PREMIUM:
      "🔶 *Plan Premium*\n• IA avanzada ilimitada\n• CRM + Pagos QR + integraciones\n💰 Precio personalizado.",
  };
  return sendText(to, plans[id]);
}

function sendDemos(to) {
  clearState(to);
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

    // 1) Ignora eventos de estado (delivered, read, etc.)
    if (change?.statuses) return res.sendStatus(200);

    const msg = change?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    // 2) Anti-echo
    const businessPhoneId = change?.metadata?.phone_number_id;
    if (msg.from === businessPhoneId) return res.sendStatus(200);

    // 3) Anti-duplicados
    if (alreadySeen(msg.id)) return res.sendStatus(200);
    remember(msg.id);

    const from = msg.from;
    const type = msg.type;

    // ---- Botones (interactive) ----
    if (type === "interactive") {
      const id =
        msg.interactive?.button_reply?.id ||
        msg.interactive?.list_reply?.id;
      if (!id) return res.sendStatus(200);

      // Botón global de volver
      if (id === "MENU_BACK") {
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      // Menú principal
      if (id.startsWith("MENU_")) {
        if (id === "MENU_PLANES")  { await sendPlanes(from);   return res.sendStatus(200); }
        if (id === "MENU_DEMOS")   { await sendDemos(from);    return res.sendStatus(200); }
        if (id === "MENU_ASESOR")  { await sendText(from, "📞 Asesor: *+591 72296430*"); return res.sendStatus(200); }
      }

      // Planes
      if (id.startsWith("PLAN_"))  { await replyPlan(from, id); return res.sendStatus(200); }

      // Demos
      if (id === "DEMO_FOOD") {
        setState(from, { demo: "food", step: "menu" });
        await sendButtons(from, "🍔 *FoodBot*\n¿Qué deseas hacer?", [
          { id: "FOOD_MENU",   title: "Ver menú"   },
          { id: "FOOD_PEDIDO", title: "Hacer pedido" },
        ]);
        return res.sendStatus(200);
      }

      if (id === "FOOD_MENU") {
        setState(from, { demo: "food", step: "pedido" });
        await sendText(
          from,
          "📋 *Menú del día*\n• Salteña — 8 Bs\n• Hamburguesa — 25 Bs\n• Jugo — 10 Bs\n\n✍️ Escribe tu pedido."
        );
        return res.sendStatus(200);
      }

      if (id === "FOOD_OK") {
        const st = getState(from);
        await sendText(from, `✅ Pedido confirmado: ${st.pedido}`);
        await sendButtons(from, "¿Deseas hacer algo más?", [
          { id: "MENU_BACK", title: "🔙 Volver al menú" },
        ]);
        clearState(from);
        return res.sendStatus(200);
      }

      if (id === "DEMO_MEDI") {
        setState(from, { demo: "medi", step: "area" });
        await sendButtons(from, "🏥 *MediBot*\nIndica especialidad (ej.: Odontología).", [
          { id: "MENU_BACK", title: "🔙 Volver al menú" },
        ]);
        return res.sendStatus(200);
      }

      if (id === "MEDI_OK") {
        const st = getState(from);
        await sendText(from, `✅ Cita confirmada en *${st.area}* el *${st.fecha}*.`);
        await sendButtons(from, "¿Qué deseas hacer ahora?", [
          { id: "MENU_BACK", title: "🔙 Volver al menú" },
        ]);
        clearState(from);
        return res.sendStatus(200);
      }

      if (id === "DEMO_LEGAL") {
        setState(from, { demo: "legal" });
        await sendButtons(
          from,
          "⚖️ *LegalBot GPT*\nEscribe tu consulta legal.\nEj.: “¿Qué pasa si me despiden sin causa?”",
          [{ id: "MENU_BACK", title: "🔙 Volver al menú" }]
        );
        return res.sendStatus(200);
      }

      return res.sendStatus(200);
    }

    // ---- Texto ----
    if (type === "text") {
      const txt = (msg.text?.body || "").trim();
      const low = txt.toLowerCase();
      const st  = getState(from);

      // Comandos rápidos para volver al menú
      if (["menu", "menú", "cancelar", "inicio", "start"].includes(low)) {
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      // Accesos rápidos por texto
      if (low === "planes")  { await sendPlanes(from);  return res.sendStatus(200); }
      if (low === "demos")   { await sendDemos(from);   return res.sendStatus(200); }
      if (["hola", "hola!", "hi"].includes(low)) {
        await sendMainMenu(from);
        return res.sendStatus(200);
      }

      // --- Flujos ---
      // FoodBot
      if (st.demo === "food") {
        if (st.step === "pedido") {
          setState(from, { step: "confirmar", pedido: txt });
          await sendButtons(from, `Confirmar pedido: "${txt}"`, [
            { id: "FOOD_OK",  title: "OK" },
            { id: "MENU_BACK", title: "🔙 Volver al menú" },
          ]);
          return res.sendStatus(200);
        }
        if (st.step === "menu") {
          // Si escribe algo en "menu", muéstrale el menú y pasa a "pedido"
          setState(from, { step: "pedido" });
          await sendText(
            from,
            "📋 *Menú del día*\n• Salteña — 8 Bs\n• Hamburguesa — 25 Bs\n• Jugo — 10 Bs\n\n✍️ Escribe tu pedido."
          );
          return res.sendStatus(200);
        }
      }

      // MediBot
      if (st.demo === "medi") {
        if (st.step === "area") {
          setState(from, { step: "fecha", area: txt });
          await sendButtons(from, "📅 Indica la fecha (ej.: 21/10 15:00).", [
            { id: "MENU_BACK", title: "🔙 Volver al menú" },
          ]);
          return res.sendStatus(200);
        }
        if (st.step === "fecha") {
          setState(from, { step: "confirmar", fecha: txt });
          await sendButtons(from, `Confirmar cita en *${st.area}* el *${txt}*`, [
            { id: "MEDI_OK",  title: "OK" },
            { id: "MENU_BACK", title: "🔙 Volver al menú" },
          ]);
          return res.sendStatus(200);
        }
      }

      // LegalBot
      if (st.demo === "legal") {
        await sendButtons(
          from,
          `🧠 *Respuesta IA simulada*\nTu consulta: "${txt}"\n\n👉 En Plan Pro/Premium, LegalBot usa GPT para redactar documentos conforme a ley boliviana.`,
          [{ id: "MENU_BACK", title: "🔙 Volver al menú" }]
        );
        return res.sendStatus(200);
      }

      // Fallback si no hay flujo activo
      await sendButtons(
        from,
        "No te entendí. ¿Qué deseas hacer?",
        [
          { id: "MENU_PLANES", title: "📦 Ver planes" },
          { id: "MENU_DEMOS",  title: "🎬 Ver demos"  },
          { id: "MENU_ASESOR", title: "🧑‍💼 Asesor"   },
        ]
      );
      return res.sendStatus(200);
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

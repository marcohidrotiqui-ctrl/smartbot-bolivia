// ===================================================
// SMARTBOT BOLIVIA - IA que potencia tu negocio
// Estable + Demos guiados + FoodBot con Delivery/Local + QR
// ===================================================
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// ---------- Config ----------
const TOKEN        = process.env.WABA_TOKEN || process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PHONE_ID     = process.env.WABA_PHONE_ID;
const GRAPH        = "https://graph.facebook.com/v20.0";
const PAYMENT_QR   = process.env.PAYMENT_QR_URL || "https://via.placeholder.com/500x500.png?text=QR+de+Pago";

// ---------- Anti-duplicados / anti-echo ----------
const seen = new Set();
function dedupe(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 800) seen.clear();
  return false;
}

// ---------- Envío WhatsApp ----------
async function wa(body) {
  const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log("WA:", res.status, JSON.stringify(data));
  return data;
}
const sendText = (to, text) =>
  wa({ messaging_product: "whatsapp", to, type: "text", text: { body: text } });

const sendButtons = (to, text, buttons) =>
  wa({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })),
      },
    },
  });

const sendImage = (to, url, caption = "") =>
  wa({
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: url, caption },
  });

// ---------- Estado ----------
const S = new Map();
const g = (id) => S.get(id) || {};
const set = (id, patch) => S.set(id, { ...g(id), ...patch });
const clear = (id) => S.delete(id);

// ---------- Menús básicos ----------
function mainGreeting() {
  return (
    "🤖 *SmartBot Bolivia*\n" +
    "Transforma tus mensajes en *ventas 24/7* con *IA*. Automatiza respuestas, agenda citas, toma pedidos y cobra con *QR*.\n\n" +
    "Elige una opción:"
  );
}

function planesText(id) {
  const map = {
    PLAN_BASIC:
      "🔹 *Plan Básico*\n" +
      "• Respuestas automáticas preconfiguradas 24/7\n" +
      "• Menús con botones en WhatsApp\n" +
      "• Ideal para negocios pequeños\n" +
      "💰 Desde *150 Bs/mes*.",
    PLAN_PRO:
      "🔷 *Plan Pro*\n" +
      "• *IA conversacional (GPT)* que entiende preguntas reales\n" +
      "• Flujos y formularios personalizados\n" +
      "• Hasta *5.000* interacciones/mes\n" +
      "💰 Desde *300 Bs/mes*.",
    PLAN_PREMIUM:
      "🔶 *Plan Premium*\n" +
      "• IA avanzada *ilimitada*\n" +
      "• Integraciones (CRM, pagos, catálogos) + análisis\n" +
      "• Soporte prioritario\n" +
      "💰 Precio *personalizado*.",
  };
  return map[id] || "";
}

const BTN_BACK = { id: "MENU_BACK", title: "🔙 Volver al menú" };

function menuPrincipal(to) {
  clear(to);
  return sendButtons(to, mainGreeting(), [
    { id: "MENU_PLANES", title: "📦 Planes" },
    { id: "MENU_DEMOS",  title: "🎬 Demos"  },
    { id: "MENU_ASESOR", title: "🧑‍💼 Asesor" },
  ]);
}

function menuPlanes(to) {
  return sendButtons(to, "📦 *Planes SmartBot Bolivia* (toca uno para ver detalles)", [
    { id: "PLAN_BASIC",   title: "Básico"   },
    { id: "PLAN_PRO",     title: "Pro"      },
    { id: "PLAN_PREMIUM", title: "Premium"  },
  ]);
}

function menuDemos(to) {
  clear(to);
  return sendButtons(
    to,
    "🎬 *Demos disponibles*\n" +
    "• *FoodBot* 🍔: toma pedidos, delivery, pago QR\n" +
    "• *MediBot* 🏥: agenda citas en segundos\n" +
    "• *LegalBot GPT* ⚖️: consultas con IA (simulada en demo)",
    [
      { id: "DEMO_FOOD_INTRO",  title: "🍔 Probar FoodBot"  },
      { id: "DEMO_MEDI_INTRO",  title: "🏥 Probar MediBot"  },
      { id: "DEMO_LEGAL_INTRO", title: "⚖️ Probar LegalBot" },
    ]
  );
}

// ---------- Demos: Intro guiada ----------
async function demoFoodIntro(to) {
  set(to, { demo: "food", step: "intro" });
  await sendText(
    to,
    "🍔 *FoodBot* te ayuda a recibir pedidos automáticamente.\n" +
    "Flujo: Ver menú → Hacer pedido → Retiro en local o Delivery → Pago por QR → Confirmación.\n"
  );
  return sendButtons(to, "¿Qué deseas hacer?", [
    { id: "FOOD_MENU",   title: "📋 Ver menú" },
    { id: "FOOD_PEDIDO", title: "🛒 Hacer pedido" },
    BTN_BACK,
  ]);
}

async function demoMediIntro(to) {
  set(to, { demo: "medi", step: "intro" });
  await sendText(
    to,
    "🏥 *MediBot* agenda citas sin llamadas.\n" +
    "Flujo: Especialidad → Fecha/Hora → Confirmación. ¡Listo!\n"
  );
  return sendButtons(to, "Empezamos:", [
    { id: "MEDI_AREA", title: "Elegir especialidad" },
    BTN_BACK,
  ]);
}

async function demoLegalIntro(to) {
  set(to, { demo: "legal", step: "intro" });
  await sendText(
    to,
    "⚖️ *LegalBot GPT* contesta consultas legales con IA.\n" +
    "En el *Plan Pro/Premium* usa GPT para responder y redactar documentos bajo normativa boliviana.\n"
  );
  return sendButtons(to, "Escribe tu consulta (demo simulada):", [BTN_BACK]);
}

// ---------- FoodBot ----------
const MENU_FOOD =
  "📋 *Menú del día*\n" +
  "• Salteña — 8 Bs\n" +
  "• Hamburguesa Clásica — 25 Bs\n" +
  "• Hamburguesa Doble — 32 Bs\n" +
  "• Papas Fritas — 12 Bs\n" +
  "• Jugo Natural — 10 Bs\n" +
  "• Refresco — 8 Bs\n\n" +
  "✍️ *Escribe tu pedido* (ej.: “2 salteñas y 1 jugo”)";

async function foodShowMenu(to) {
  set(to, { demo: "food", step: "pedido" });
  return sendButtons(to, MENU_FOOD, [{ id: "FOOD_TIPEAR", title: "📝 Escribir pedido" }, BTN_BACK]);
}

async function foodAskPedido(to) {
  set(to, { demo: "food", step: "pedido" });
  return sendButtons(
    to,
    "🛒 ¿Qué deseas pedir? Escribe cantidad + producto (ej.: “1 clásica y 1 jugo”).",
    [BTN_BACK]
  );
}

async function foodAfterPedido(to, pedidoTexto) {
  set(to, { demo: "food", step: "modo", pedido: pedidoTexto });
  return sendButtons(
    to,
    `Confirmo tu pedido: *${pedidoTexto}*.\n¿Cómo lo recibes?`,
    [
      { id: "FOOD_LOCAL",    title: "🏪 Retiro en local" },
      { id: "FOOD_DELIVERY", title: "🚚 Delivery" },
    ]
  );
}

async function foodAskHoraLocal(to) {
  set(to, { step: "hora_local" });
  return sendButtons(to, "⏰ ¿A qué hora pasarás a recoger? (ej.: 12:30)", [BTN_BACK]);
}

async function foodAskDireccion(to) {
  set(to, { step: "direccion" });
  return sendButtons(to, "📍 Comparte la *dirección completa* y una *referencia* por favor.", [BTN_BACK]);
}

async function foodConfirmAndPayLocal(to, hora) {
  const st = g(to);
  set(to, { step: "pago_local", hora_local: hora });
  await sendText(
    to,
    `✅ *Pedido listo para retiro*\n` +
    `• Pedido: *${st.pedido}*\n` +
    `• Retiro: *${hora}*\n`
  );
  await sendImage(to, PAYMENT_QR, "🔗 Escanea el QR para pagar");
  return sendButtons(to, "Cuando realices el pago, confirma:", [
    { id: "FOOD_PAGADO", title: "✅ Pagado" },
    BTN_BACK,
  ]);
}

async function foodConfirmAndPayDelivery(to, direccionTexto) {
  const st = g(to);
  set(to, { step: "pago_delivery", direccion: direccionTexto });
  await sendText(
    to,
    `✅ *Pedido con delivery*\n` +
    `• Pedido: *${st.pedido}*\n` +
    `• Dirección: *${direccionTexto}*\n` +
    `Un repartidor se asignará tras el pago.`
  );
  await sendImage(to, PAYMENT_QR, "🔗 Escanea el QR para pagar");
  return sendButtons(to, "Cuando realices el pago, confirma:", [
    { id: "FOOD_PAGADO", title: "✅ Pagado" },
    BTN_BACK,
  ]);
}

async function foodFinish(to) {
  clear(to);
  await sendText(to, "🎉 ¡Gracias! Tu pago fue recibido. Estamos procesando tu pedido.");
  return sendButtons(to, "¿Deseas algo más?", [BTN_BACK]);
}

// ---------- MediBot ----------
async function mediAskArea(to) {
  set(to, { demo: "medi", step: "area" });
  return sendButtons(to, "🩺 Indica la especialidad (ej.: Odontología, Pediatría…)", [BTN_BACK]);
}
async function mediAskFecha(to, area) {
  set(to, { step: "fecha", area });
  return sendButtons(to, "📅 ¿Fecha y hora? (ej.: 21/10 15:00)", [BTN_BACK]);
}
async function mediConfirm(to, fecha) {
  const st = g(to);
  set(to, { step: "confirmar", fecha });
  return sendButtons(to, `Confirmar cita *${st.area}* el *${fecha}*`, [
    { id: "MEDI_OK", title: "✅ Confirmar" },
    BTN_BACK,
  ]);
}
async function mediFinish(to) {
  const st = g(to);
  clear(to);
  await sendText(to, `✅ *Cita confirmada*\n• Área: *${st.area}*\n• Fecha: *${st.fecha}*`);
  return sendButtons(to, "¿Deseas otra acción?", [BTN_BACK]);
}

// ---------- LegalBot (demo simulada) ----------
async function legalReceive(to, consulta) {
  return sendButtons(
    to,
    `🧠 *Respuesta IA simulada*\nTu consulta: "${consulta}"\n\n` +
      "👉 En Plan Pro/Premium, LegalBot usa *GPT* para responder y *redactar documentos* conforme a normativa boliviana.",
    [BTN_BACK]
  );
}

// ---------- Webhook VERIFY ----------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// ---------- Webhook POST ----------
app.post("/webhook", async (req, res) => {
  try {
    const entry  = req.body?.entry?.[0];
    const value  = entry?.changes?.[0]?.value;
    if (value?.statuses) return res.sendStatus(200); // delivered/read/etc.

    const msg = value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const businessPhoneId = value?.metadata?.phone_number_id;
    if (msg.from === businessPhoneId) return res.sendStatus(200); // echo
    if (dedupe(msg.id)) return res.sendStatus(200);              // duplicado

    const type = msg.type;

    // ---- Interactive (botones) ----
    if (type === "interactive") {
      const id = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
      if (!id) return res.sendStatus(200);
      if (id === "MENU_BACK") { await menuPrincipal(from); return res.sendStatus(200); }

      // Menú principal
      if (id === "MENU_PLANES")  { await menuPlanes(from); return res.sendStatus(200); }
      if (id === "MENU_DEMOS")   { await menuDemos(from);  return res.sendStatus(200); }
      if (id === "MENU_ASESOR")  { await sendText(from, "📞 Asesor: *+591 72296430*"); return res.sendStatus(200); }

      // Planes
      if (["PLAN_BASIC","PLAN_PRO","PLAN_PREMIUM"].includes(id)) {
        await sendText(from, planesText(id));
        await sendButtons(from, "¿Deseas contactar a un asesor?", [
          { id: "MENU_ASESOR", title: "📞 Sí, hablar con asesor" },
          BTN_BACK,
        ]);
        return res.sendStatus(200);
      }

      // Demos: Intros
      if (id === "DEMO_FOOD_INTRO")  return demoFoodIntro(from);
      if (id === "DEMO_MEDI_INTRO")  return demoMediIntro(from);
      if (id === "DEMO_LEGAL_INTRO") return demoLegalIntro(from);

      // FoodBot
      if (id === "FOOD_MENU")   return foodShowMenu(from);
      if (id === "FOOD_TIPEAR") return foodAskPedido(from);
      if (id === "FOOD_PEDIDO") return foodAskPedido(from);
      if (id === "FOOD_LOCAL")  return foodAskHoraLocal(from);
      if (id === "FOOD_DELIVERY") return foodAskDireccion(from);
      if (id === "FOOD_PAGADO") return foodFinish(from);

      // MediBot
      if (id === "MEDI_AREA") return mediAskArea(from);
      if (id === "MEDI_OK")   return mediFinish(from);

      return res.sendStatus(200);
    }

    // ---- Texto ----
    if (type === "text") {
      const raw = (msg.text?.body || "").trim();
      const low = raw.toLowerCase();
      const st  = g(from);

      // comandos rápidos
      if (["menu","menú","cancelar","inicio","start"].includes(low)) { await menuPrincipal(from); return res.sendStatus(200); }
      if (["hola","hola!","hi"].includes(low)) { await menuPrincipal(from); return res.sendStatus(200); }
      if (low === "planes") { await menuPlanes(from); return res.sendStatus(200); }
      if (low === "demos")  { await menuDemos(from);  return res.sendStatus(200); }

      // Flujos
      if (st.demo === "food") {
        if (st.step === "pedido") {
          await foodAfterPedido(from, raw);
          return res.sendStatus(200);
        }
        if (st.step === "hora_local") {
          await foodConfirmAndPayLocal(from, raw);
          return res.sendStatus(200);
        }
        if (st.step === "direccion") {
          await foodConfirmAndPayDelivery(from, raw);
          return res.sendStatus(200);
        }
      }

      if (st.demo === "medi") {
        if (st.step === "area") {
          await mediAskFecha(from, raw);
          return res.sendStatus(200);
        }
        if (st.step === "fecha") {
          await mediConfirm(from, raw);
          return res.sendStatus(200);
        }
      }

      if (st.demo === "legal") {
        await legalReceive(from, raw);
        return res.sendStatus(200);
      }

      // fallback
      await sendButtons(
        from,
        "No te entendí 🙈. ¿Qué deseas hacer?",
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

// ---------- Healthcheck ----------
app.get("/", (_, res) => res.send("✅ SmartBot Bolivia OK con IA"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SmartBot Bolivia activo en puerto ${PORT}`));

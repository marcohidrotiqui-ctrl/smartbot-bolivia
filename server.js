// server.js — SmartBot Bolivia (WhatsApp Cloud API)
// Node 18+ | "type": "module" en package.json

import express from "express";
import dotenv from "dotenv";

// Si tu runtime no tiene fetch, descomenta estas dos líneas y añade node-fetch en package.json
// import fetch from "node-fetch";
// globalThis.fetch = fetch;

dotenv.config();
const app = express();
app.use(express.json());

// ====== ENV ======
const WABA_TOKEN     = process.env.WABA_TOKEN;
const WABA_PHONE_ID  = process.env.WABA_PHONE_ID;
const VERIFY_TOKEN   = process.env.VERIFY_TOKEN || "smartbot-verify-123";
const PORT           = process.env.PORT || 10000;

const GRAPH = "https://graph.facebook.com/v20.0";

// =============== Helpers de envío ===============
async function waFetch(path, body) {
  const url = `${GRAPH}/${WABA_PHONE_ID}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WABA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("WA API error:", JSON.stringify(data, null, 2));
  } else {
    console.log("WA OK:", JSON.stringify(data));
  }
  return { ok: res.ok, data };
}

async function sendText(to, text) {
  return waFetch("messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

// Botones (máx. 3)
async function sendButtons(to, bodyText, buttons = []) {
  const comps = buttons.slice(0, 3).map(b => ({
    type: "reply",
    reply: { id: b.id, title: b.title },
  }));
  return waFetch("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: comps },
    },
  });
}

// Lista interactiva (sin límite de 3)
async function sendList(to, title, bodyText, options = [], buttonLabel = "Ver opciones") {
  const rows = options.map(o => ({
    id: o.id,
    title: o.title,
    description: o.description || "",
  }));
  return waFetch("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: title },
      body: { text: bodyText },
      footer: { text: "SmartBot Bolivia" },
      action: {
        button: buttonLabel,
        sections: [{ title: "Opciones", rows }],
      },
    },
  });
}

// =============== Contenido del Bot ===============
const CONTACTO_ASESOR = "+591 72296430";

// Saludo + Acciones principales
async function sendWelcome(to) {
  const saludo = `👋 ¡Hola! Soy *SmartBot Bolivia*.

Te ayudo a automatizar atención y ventas con IA 🤖

Elige una opción:`;
  // 3 botones (límite WhatsApp)
  return sendButtons(to, saludo, [
    { id: "MENU_PLANES",  title: "📦 Planes" },
    { id: "MENU_ASESOR",  title: "💬 Asesor" },
    { id: "MENU_HORARIO", title: "🕒 Horarios" },
  ]);
}

async function sendPlanes(to) {
  const msg =
`📦 *Planes SmartBot*

🌱 *Básico* — Respuestas rápidas por WhatsApp/Telegram (FAQs). Ideal para restaurantes y tiendas pequeñas.

🚀 *Pro* — *Incluye IA conversacional (GPT)*, hasta 5.000 interacciones/mes, conexión con formularios/BD.

👑 *Premium* — IA avanzada, flujos personalizados, analítica y pagos QR.

¿Quieres ver *demos de bots listos*? Escribe *demos* o elige en el menú de demos.`;
  return sendText(to, msg);
}

async function sendAsesor(to) {
  const text =
`📲 *Asesor comercial*
Escríbenos o llama a *${CONTACTO_ASESOR}*.
También puedes enviar *menu* para ver opciones.`;
  return sendText(to, text);
}

async function sendHorarios(to) {
  const text =
`🕒 *Horarios de atención*
Lunes a Viernes: 09:00 — 18:00
Sábados: 09:00 — 13:00
Domingos y feriados: atención por WhatsApp.`;
  return sendText(to, text);
}

// =============== MENÚ DE DEMOS (Legal/Medi/Food) ===============
async function sendDemosMenu(to) {
  return sendList(
    to,
    "DEMOS — Bots listos",
    "Selecciona un bot para ver su demo:",
    [
      { id: "DEMO_MENU_LEGAL", title: "⚖️ LegalBot", description: "Consultas 24/7, docs según norma BO" },
      { id: "DEMO_MENU_MEDI",  title: "🩺 MediBot",  description: "Pacientes, citas, pagos QR" },
      { id: "DEMO_MENU_FOOD",  title: "🍽️ FoodBot",  description: "Pedidos, reservas, delivery" },
    ],
    "Ver demos"
  );
}

// =============== DEMO: LegalBot ===============
async function sendDemoMenuLegal(to) {
  return sendList(
    to,
    "⚖️ LegalBot — DEMO",
    "Elige una función para probar:",
    [
      { id: "DEMO_LEGAL_CONSULTA", title: "Consulta 24/7",   description: "Respuesta automática (demo)" },
      { id: "DEMO_LEGAL_CARTA",    title: "Carta/Contrato",  description: "Redacción según normativa (demo)" },
      { id: "DEMO_LEGAL_NORMA",    title: "Buscar Norma",    description: "Cita y resumen normativo (demo)" },
    ]
  );
}
async function demoLegalConsulta(to) {
  const t =
`⚖️ *LegalBot — Consulta 24/7 (DEMO)*
“¿Me pueden despedir sin preaviso?”

• Resumen: Usualmente requiere preaviso o indemnización (DEMO).
• Base legal BO: Ley General del Trabajo — *Artículo X* (DEMO)
• Recomendación: Solicitar por escrito la causa del despido y revisar liquidación (DEMO).

¿Deseas un borrador de carta? Escribe *demos* → LegalBot → Carta/Contrato.`;
  return sendText(to, t);
}
async function demoLegalCarta(to) {
  const t =
`📝 *LegalBot — Redacción de documento (DEMO)*
Ej.: Carta de reclamo por despido.

Señores de *Cocina Express SRL*:
Yo, *Luis Choque*, expongo que se produjo despido sin preaviso. Solicito se respeten las disposiciones de la LGT y se regularice mi liquidación conforme normativa vigente (DEMO).

Atentamente,
Luis Choque — CI: 1234567 LP

¿Ver una cita legal? Elige *Buscar Norma* en LegalBot (demo).`;
  return sendText(to, t);
}
async function demoLegalNorma(to) {
  const t =
`📚 *LegalBot — Búsqueda de norma (DEMO)*
“Multas por no afiliar a la CNS”.

• Norma: (DEMO) Ley — Art. X.
• Resumen: Requisitos, sujetos obligados y sanciones.
• Nota: Solo para demostración (no asesoría real).

¿Probar otra función? Escribe *demos* → LegalBot.`;
  return sendText(to, t);
}

// =============== DEMO: MediBot ===============
async function sendDemoMenuMedi(to) {
  return sendList(
    to,
    "🩺 MediBot — DEMO",
    "¿Qué deseas probar?",
    [
      { id: "DEMO_MEDI_TRIAJE", title: "Orientación rápida",  description: "Síntomas comunes (demo)" },
      { id: "DEMO_MEDI_CITA",   title: "Reservar cita",       description: "Especialidad + horario (demo)" },
      { id: "DEMO_MEDI_PAGO",   title: "Pagar consulta (QR)", description: "Confirmación demo" },
    ]
  );
}
async function demoMediTriaje(to) {
  const t =
`🩺 *MediBot — Orientación (DEMO)*
Síntoma: *fiebre*.

• Recomendación: Hidratación y control de temperatura.
• Alertas: Si supera 39°C, confusión o rigidez de nuca → emergencias.
(Esto NO es diagnóstico real, solo demostración.)

¿Reservamos una cita? Escribe *demos* → MediBot → Reservar cita.`;
  return sendText(to, t);
}
async function demoMediCita(to) {
  const t =
`📅 *MediBot — Reserva (DEMO)*
Especialidad: *Medicina General*
Paciente: *María López* (ID 12345)
Fecha/hora: *Mañana 10:30*
Ticket: *CITA-DEM-1030*

¿Deseas pagar? Escribe *demos* → MediBot → Pagar consulta (QR).`;
  return sendText(to, t);
}
async function demoMediPago(to) {
  const t =
`💳 *MediBot — Pago con QR (DEMO)*
Monto: 100 Bs
QR: https://example.com/qr-demo
Estado: *Pago recibido (DEMO)* ✅

¿Cambiar horario? Escribe *demos* → MediBot.`;
  return sendText(to, t);
}

// =============== DEMO: FoodBot ===============
async function sendDemoMenuFood(to) {
  return sendList(
    to,
    "🍽️ FoodBot — DEMO",
    "Elige una opción para continuar:",
    [
      { id: "DEMO_FOOD_MENU",   title: "Ver menú",      description: "3 ítems demo con precios" },
      { id: "DEMO_FOOD_PEDIR",  title: "Hacer pedido",  description: "Selección + resumen + QR" },
      { id: "DEMO_FOOD_ESTADO", title: "Estado pedido", description: "Seguimiento (demo)" },
    ]
  );
}
async function demoFoodMenu(to) {
  const t =
`📋 *Menú (DEMO)*
• Silupe Burger — 28 Bs
• Salchipapas — 18 Bs
• Jugo de maracuyá — 10 Bs

¿Hacemos un pedido? Escribe *demos* → FoodBot → Hacer pedido.`;
  return sendText(to, t);
}
async function demoFoodPedir(to) {
  const t =
`🛒 *Pedido (DEMO)*
Productos: Silupe Burger x2 (56 Bs) + Maracuyá x1 (10 Bs)
Total: *66 Bs*
Modalidad: *Delivery*
N° Pedido: *DEMO-001*
QR Pago: https://example.com/qr-demo

Tras confirmar pago, el pedido pasa a *En preparación*.`;
  return sendText(to, t);
}
async function demoFoodEstado(to) {
  const t =
`🚚 *Estado del pedido (DEMO)*
Pedido *DEMO-001*: En preparación → En camino (si consultas nuevamente).

¿Ver menú otra vez? Escribe *demos* → FoodBot.`;
  return sendText(to, t);
}

// =============== WEBHOOK GET (verificación) ===============
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado ✅");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// =============== WEBHOOK POST (mensajes) ===============
app.post("/webhook", async (req, res) => {
  try {
    const entry   = req.body?.entry?.[0];
    const change  = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    const from    = message?.from;

    if (!message || !from) return res.sendStatus(200);

    // --- Mensaje de texto ---
    if (message.type === "text") {
      const txt = (message.text?.body || "").trim().toLowerCase();

      // Menú principal
      if (["hola", "buenas", "menu", "menú", "hi", "inicio"].includes(txt)) {
        await sendWelcome(from); return res.sendStatus(200);
      }

      // Accesos rápidos
      if (txt.includes("planes"))   { await sendPlanes(from);   return res.sendStatus(200); }
      if (txt.includes("asesor"))   { await sendAsesor(from);   return res.sendStatus(200); }
      if (txt.includes("horario"))  { await sendHorarios(from); return res.sendStatus(200); }

      // DEMOS — entrada general
      if (["demo", "demos", "bots", "bots listos"].includes(txt)) {
        await sendDemosMenu(from); return res.sendStatus(200);
      }

      // DEMOS — accesos directos
      if (txt === "demo legal") { await sendDemoMenuLegal(from); return res.sendStatus(200); }
      if (txt === "demo medi")  { await sendDemoMenuMedi(from);  return res.sendStatus(200); }
      if (txt === "demo food")  { await sendDemoMenuFood(from);  return res.sendStatus(200); }

      // Fallback amable
      await sendText(from, "👋 Te envié el menú. Elige *Planes*, *Asesor*, *Horarios* o escribe *demos*.");
      await sendDemosMenu(from);
      return res.sendStatus(200);
    }

    // --- Interactivos (botones / listas) ---
    if (message.type === "interactive") {
      const i = message.interactive;

      // Botones (máx. 3 del menú principal)
      if (i.type === "button_reply") {
        const id = i.button_reply?.id;
        if (id === "MENU_PLANES")  { await sendPlanes(from);   return res.sendStatus(200); }
        if (id === "MENU_ASESOR")  { await sendAsesor(from);   return res.sendStatus(200); }
        if (id === "MENU_HORARIO") { await sendHorarios(from); return res.sendStatus(200); }
      }

      // Listas (demos y submenús)
      if (i.type === "list_reply") {
        const id = i.list_reply?.id || "";

        // MENÚ DEMOS (elige bot)
        if (id === "DEMO_MENU_LEGAL") { await sendDemoMenuLegal(from); return res.sendStatus(200); }
        if (id === "DEMO_MENU_MEDI")  { await sendDemoMenuMedi(from);  return res.sendStatus(200); }
        if (id === "DEMO_MENU_FOOD")  { await sendDemoMenuFood(from);  return res.sendStatus(200); }

        // LEGALBOT
        if (id === "DEMO_LEGAL_CONSULTA") { await demoLegalConsulta(from); return res.sendStatus(200); }
        if (id === "DEMO_LEGAL_CARTA")    { await demoLegalCarta(from);    return res.sendStatus(200); }
        if (id === "DEMO_LEGAL_NORMA")    { await demoLegalNorma(from);    return res.sendStatus(200); }

        // MEDIBOT
        if (id === "DEMO_MEDI_TRIAJE") { await demoMediTriaje(from); return res.sendStatus(200); }
        if (id === "DEMO_MEDI_CITA")   { await demoMediCita(from);   return res.sendStatus(200); }
        if (id === "DEMO_MEDI_PAGO")   { await demoMediPago(from);   return res.sendStatus(200); }

        // FOODBOT
        if (id === "DEMO_FOOD_MENU")   { await demoFoodMenu(from);   return res.sendStatus(200); }
        if (id === "DEMO_FOOD_PEDIR")  { await demoFoodPedir(from);  return res.sendStatus(200); }
        if (id === "DEMO_FOOD_ESTADO") { await demoFoodEstado(from); return res.sendStatus(200); }

        // Si algo más, vuelve al menú de demos:
        await sendDemosMenu(from);
        return res.sendStatus(200);
      }
    }

    // Ignorar tipos no manejados por ahora (audio, imagen, etc)
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err?.response?.data || err.message || err);
    res.sendStatus(200);
  }
});

// Healthcheck
app.get("/", (_req, res) => res.status(200).send("SmartBot Bolivia — OK"));

// Start
app.listen(PORT, () => {
  console.log(`✅ SmartBot Bolivia ejecutándose en puerto ${PORT}`);
});

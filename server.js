// ===================================================
// SMARTBOT BOLIVIA 2025
// IA + Demos Pro (Food/Medi/Legal) + QR + Vista previa protegida
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
const DOC_PREVIEW  = process.env.DOC_PREVIEW_URL || "https://via.placeholder.com/900x1200.png?text=Vista+previa+protegida";
const DOC_BASE     = process.env.DOC_DOWNLOAD_BASE || "https://example.com/download/";

// ---------- Anti-duplicados / anti-echo ----------
const seen = new Set();
function dedupe(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > 1000) seen.clear();
  return false;
}

// ---------- WhatsApp helpers ----------
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

const sendList = (to, header, body, rows, buttonText = "Ver opciones") =>
  wa({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      footer: { text: "SmartBot Bolivia" },
      action: {
        button: buttonText,
        sections: [
          {
            title: "Opciones",
            rows: rows.map(r => ({
              id: r.id,
              title: r.title,
              description: r.description || "",
            })),
          },
        ],
      },
    },
  });

const sendImage = (to, url, caption = "") =>
  wa({ messaging_product: "whatsapp", to, type: "image", image: { link: url, caption } });

// ---------- Estado ----------
/**
 * Estructura ejemplo:
 * S.get(from) = {
 *   flow: 'idle' | 'food' | 'medi' | 'legal',
 *   step: string,
 *   // food
 *   pedido, hora_local, direccion,
 *   // medi
 *   area, slot, doctorId, doctorName,
 *   // legal
 *   legalMode: 'consult'|'doc'|'cita',
 *   docType, docPayload, citaArea, citaSlot, citaLawyerId, citaLawyerName
 * }
 */
const S = new Map();
const g = (id) => S.get(id) || {};
const set = (id, patch) => S.set(id, { ...g(id), ...patch });
const clear = (id) => S.delete(id);

// ---------- Utilidades ----------
const BTN_BACK = { id: "MENU_BACK", title: "🔙 Volver al menú" };
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// ---------- Menú principal / Planes / Demos ----------
const greeting =
  "🤖 *SmartBot Bolivia*\n" +
  "La *IA* que impulsa tu negocio: atiendo 24/7, tomo pedidos, agendo citas y cobro con *QR*.\n\n" +
  "¿Qué deseas hacer hoy?";

function menuPrincipal(to) {
  clear(to);
  return sendButtons(to, greeting, [
    { id: "MENU_PLANES", title: "💼 Ver planes" },
    { id: "MENU_DEMOS",  title: "🎬 Probar demos" },
    { id: "MENU_ASESOR", title: "☎️ Hablar con asesor" },
  ]);
}
function menuPlanes(to) {
  return sendList(
    to,
    "Planes",
    "Elige un plan para ver detalles:",
    [
      { id: "PLAN_BASIC",   title: "Básico — 150 Bs/mes",   description: "Respuestas 24/7 + botones" },
      { id: "PLAN_PRO",     title: "Pro — 300 Bs/mes",      description: "Incluye IA GPT + QR" },
      { id: "PLAN_PREMIUM", title: "Premium — Personalizado", description: "IA avanzada + CRM + integraciones" },
    ],
    "Ver planes"
  );
}
function textPlan(id) {
  const map = {
    PLAN_BASIC:
      "🔹 *Plan Básico*\n• Respuestas automáticas 24/7\n• Menús con botones en WhatsApp\n• Ideal para negocios pequeños\n💰 *150 Bs/mes*",
    PLAN_PRO:
      "🔷 *Plan Pro*\n• *IA conversacional (GPT)*\n• Flujos personalizados + métricas\n• Pagos *QR* integrados\n💰 *300 Bs/mes*",
    PLAN_PREMIUM:
      "🔶 *Plan Premium*\n• IA avanzada *ilimitada*\n• CRM + reportes + integraciones (Delivery/Citas)\n• Soporte prioritario\n💰 *Precio personalizado*",
  };
  return map[id] || "";
}
function menuDemos(to) {
  clear(to);
  return sendButtons(
    to,
    "🎬 *Demos disponibles*\n• 🍔 FoodBot — pedidos y QR\n• 🏥 MediBot — citas con horarios y médicos\n• ⚖️ LegalBot GPT — consultas, documentos y citas",
    [
      { id: "DEMO_FOOD_INTRO",  title: "🍔 Probar FoodBot"  },
      { id: "DEMO_MEDI_INTRO",  title: "🏥 Probar MediBot"  },
      { id: "DEMO_LEGAL_INTRO", title: "⚖️ Probar LegalBot" },
    ]
  );
}

// ---------- FOODBOT ----------
const MENU_FOOD =
  "📋 *Menú del día*\n" +
  "• Salteña — 8 Bs\n" +
  "• Hamburguesa Clásica — 25 Bs\n" +
  "• Hamburguesa Doble — 32 Bs\n" +
  "• Papas Fritas — 12 Bs\n" +
  "• Jugo Natural — 10 Bs\n" +
  "• Refresco — 8 Bs\n\n" +
  "✍️ *Escribe tu pedido* (ej.: “2 salteñas y 1 jugo”).";

async function foodIntro(to) {
  set(to, { flow: "food", step: "intro" });
  await sendText(
    to,
    "🍔 *FoodBot IA*\n" +
    "Ver menú → Hacer pedido → Local o Delivery → Pago *QR* → Confirmación."
  );
  return sendButtons(to, "¿Qué deseas hacer?", [
    { id: "FOOD_MENU",   title: "📋 Ver menú" },
    { id: "FOOD_PEDIDO", title: "🛒 Hacer pedido" },
    BTN_BACK,
  ]);
}
const foodShowMenu  = (to) => { set(to, { flow:"food", step:"pedido" }); return sendButtons(to, MENU_FOOD, [{ id:"FOOD_TIPEAR", title:"📝 Escribir pedido" }, BTN_BACK]); };
const foodAskPedido = (to) => { set(to, { flow:"food", step:"pedido" }); return sendButtons(to, "🛒 ¿Qué deseas pedir? Escribe cantidad + producto.", [BTN_BACK]); };
async function foodAfterPedido(to, pedido) {
  set(to, { step: "modo", pedido });
  return sendButtons(to, `Confirmo tu pedido: *${pedido}*.\n¿Cómo lo recibes?`, [
    { id: "FOOD_LOCAL",    title: "🏪 Retiro en local" },
    { id: "FOOD_DELIVERY", title: "🚚 Delivery" },
  ]);
}
const foodAskHoraLocal = (to) => { set(to, { step: "hora_local" }); return sendButtons(to, "⏰ ¿A qué hora pasarás a recoger? (ej.: 12:30)", [BTN_BACK]); };
const foodAskDireccion = (to) => { set(to, { step: "direccion"  }); return sendButtons(to, "📍 Dirección completa + referencia, por favor.", [BTN_BACK]); };
async function foodConfirmAndPayLocal(to, hora) {
  const st = g(to);
  set(to, { step: "pago_local", hora_local: hora });
  await sendText(to, `✅ *Pedido para retiro*\n• Pedido: *${st.pedido}*\n• Hora: *${hora}*`);
  await sendImage(to, PAYMENT_QR, "🔗 Escanea el QR para pagar");
  return sendButtons(to, "Cuando pagues, confirma:", [{ id: "FOOD_PAGADO", title: "✅ Pagado" }, BTN_BACK]);
}
async function foodConfirmAndPayDelivery(to, dir) {
  const st = g(to);
  set(to, { step: "pago_delivery", direccion: dir });
  await sendText(to, `✅ *Pedido con delivery*\n• Pedido: *${st.pedido}*\n• Dirección: *${dir}*`);
  await sendImage(to, PAYMENT_QR, "🔗 Escanea el QR para pagar");
  return sendButtons(to, "Cuando pagues, confirma:", [{ id: "FOOD_PAGADO", title: "✅ Pagado" }, BTN_BACK]);
}
async function foodFinish(to) {
  clear(to);
  await sendText(to, "🎉 ¡Gracias! Tu pago fue recibido. Estamos procesando tu pedido.");
  return sendButtons(to, "¿Deseas algo más?", [BTN_BACK]);
}

// ---------- MEDIBOT (especialidades, horarios, médicos) ----------
const MEDI_DATA = {
  odontologia: {
    slots: [
      { id: "2025-10-22T09:00", label: "Mié 22 — 09:00" },
      { id: "2025-10-22T15:30", label: "Mié 22 — 15:30" },
      { id: "2025-10-23T10:00", label: "Jue 23 — 10:00" }
    ],
    doctors: [
      { id: "MD_CARDENAS", name: "Dra. Cárdenas" },
      { id: "MD_VARGAS",   name: "Dr. Vargas" }
    ]
  },
  "medicina general": {
    slots: [
      { id: "2025-10-22T11:00", label: "Mié 22 — 11:00" },
      { id: "2025-10-23T16:30", label: "Jue 23 — 16:30" }
    ],
    doctors: [
      { id: "MD_PEREZ", name: "Dr. Pérez" },
      { id: "MD_MAMANI", name: "Dra. Mamani" }
    ]
  },
  pediatria: {
    slots: [
      { id: "2025-10-22T10:00", label: "Mié 22 — 10:00" },
      { id: "2025-10-23T14:00", label: "Jue 23 — 14:00" }
    ],
    doctors: [
      { id: "MD_LARA", name: "Dra. Lara" },
      { id: "MD_SUAREZ", name: "Dr. Suárez" }
    ]
  }
};

async function mediIntro(to) {
  set(to, { flow: "medi", step: "intro" });
  const rows = [
    { id: "MEDI_AREA_odontologia",      title: "Odontología",      description: "Limpieza, caries, ortodoncia" },
    { id: "MEDI_AREA_medicina general", title: "Medicina General", description: "Chequeo general" },
    { id: "MEDI_AREA_pediatria",        title: "Pediatría",        description: "Niños y adolescentes" }
  ];
  return sendList(to, "Especialidades", "Elige tu especialidad para ver horarios disponibles:", rows, "Elegir");
}
async function mediShowSlots(to, areaKey) {
  const spec = MEDI_DATA[areaKey];
  if (!spec) return sendText(to, "No hay horarios para esa especialidad (demo).");
  set(to, { flow:"medi", step:"slot", area: areaKey });
  const rows = spec.slots.map(s => ({ id: `MEDI_SLOT_${s.id}`, title: s.label, description: "Elegir horario" }));
  return sendList(to, `Horarios — ${cap(areaKey)}`, "Selecciona un horario:", rows, "Horarios");
}
async function mediShowDoctors(to) {
  const st = g(to);
  const spec = MEDI_DATA[st.area];
  set(to, { step: "doctor" });
  const rows = spec.doctors.map(d => ({ id: `MEDI_DOC_${d.id}`, title: d.name, description: "Disponible" }));
  return sendList(to, `Médicos — ${cap(st.area)}`, `Horario elegido: ${formatSlot(st.slot)}`, rows, "Elegir médico");
}
async function mediConfirm(to) {
  const st = g(to);
  set(to, { step: "confirmar" });
  return sendButtons(
    to,
    `Confirmar cita:\n• Área: *${cap(st.area)}*\n• Horario: *${formatSlot(st.slot)}*\n• Médico: *${st.doctorName}*\n\n💰 Consulta: 50 Bs`,
    [{ id: "MEDI_OK", title: "✅ Confirmar" }, BTN_BACK]
  );
}
async function mediPay(to) {
  await sendImage(to, PAYMENT_QR, "🔗 Escanea el QR para pagar la consulta");
  return sendButtons(to, "Cuando pagues, confirma:", [{ id: "MEDI_PAGADO", title: "✅ Pagado" }, BTN_BACK]);
}
async function mediFinish(to) {
  const st = g(to);
  clear(to);
  await sendText(
    to,
    `✅ *Cita confirmada*\n• Área: *${cap(st.area)}*\n• Horario: *${formatSlot(st.slot)}*\n• Médico: *${st.doctorName}*\n\n` +
    "Recibirás un recordatorio 30 minutos antes."
  );
  return sendButtons(to, "¿Deseas otra acción?", [BTN_BACK]);
}
const formatSlot = (id) => id.includes("T") ? id.replace("T"," ") : id;

// ---------- LEGALBOT (consultas, documentos con vista previa, citas con abogados) ----------
const LEGAL_DOCS = [
  { id: "DOC_RECLAMO_LAB", title: "Carta de Reclamo Laboral", price: 25 },
  { id: "DOC_CONTR_ALQ",   title: "Contrato de Alquiler",     price: 35 },
  { id: "DOC_CARTA_PODER", title: "Carta Poder Notarial",     price: 20 },
  { id: "DOC_DIVORCIO",    title: "Acuerdo de Divorcio",      price: 60 }
];

const LEGAL_CITAS = {
  laboral: {
    slots: [
      { id: "2025-10-22T10:00", label: "Mié 22 — 10:00" },
      { id: "2025-10-22T15:30", label: "Mié 22 — 15:30" },
      { id: "2025-10-23T09:00", label: "Jue 23 — 09:00" }
    ],
    lawyers: [
      { id: "LAW_ANDRADE", name: "Dr. Andrade — Laboral" },
      { id: "LAW_ROJAS",   name: "Dra. Rojas — Despidos" }
    ]
  },
  civil: {
    slots: [
      { id: "2025-10-22T11:00", label: "Mié 22 — 11:00" },
      { id: "2025-10-23T16:00", label: "Jue 23 — 16:00" }
    ],
    lawyers: [
      { id: "LAW_PEREZ", name: "Dr. Pérez — Civil" },
      { id: "LAW_FLORES", name: "Dra. Flores — Contratos" }
    ]
  }
};

async function legalIntro(to) {
  set(to, { flow: "legal", step: "intro" });
  return sendButtons(
    to,
    "⚖️ *LegalBot GPT*\nPuedo ayudarte a:\n• Consultar temas legales\n• Generar documentos con IA (vista previa + pago)\n• Agendar cita con abogado",
    [
      { id: "LEGAL_CONSULT", title: "💬 Consultar" },
      { id: "LEGAL_DOCS",    title: "🧾 Documentos" },
      { id: "LEGAL_CITAS",   title: "📅 Cita con abogado" }
    ]
  );
}

// --- Consultas (texto libre, IA simulada) ---
async function legalConsultExplain(to) {
  set(to, { step: "consult" });
  return sendButtons(
    to,
    "Escribe tu consulta legal (ej.: “Me despidieron sin causa”).\n*En Plan Pro/Premium, GPT redacta documentos conforme a ley boliviana.*",
    [BTN_BACK]
  );
}
async function legalConsultAnswer(to, question) {
  return sendButtons(
    to,
    `🧠 *Orientación legal (demo)*\nConsulta: “${question}”\n\n• Según la *Ley General del Trabajo*, el despido sin causa es improcedente.\n• Podrías exigir *desahucio* y *beneficios sociales*.\n\n¿Deseas *generar documento* o *agendar cita*?\n`,
    [
      { id: "LEGAL_DOCS",  title: "🧾 Generar documento" },
      { id: "LEGAL_CITAS", title: "📅 Agendar cita" }
    ]
  );
}

// --- Documentos (vista previa protegida + pago + link 24h) ---
async function legalDocsList(to) {
  set(to, { step: "docs" });
  const rows = LEGAL_DOCS.map(d => ({ id: `LEGAL_DOC_${d.id}`, title: `${d.title} — ${d.price} Bs` }));
  return sendList(to, "Documentos disponibles", "Elige un documento para generarlo con IA:", rows, "Ver docs");
}
async function legalDocCollect(to, docId) {
  // guardar el tipo y pedir datos
  set(to, { step: "doc_inputs", docType: docId, docPayload: {} });
  const prompts = {
    DOC_RECLAMO_LAB: "Indica: *Nombre del trabajador*, *empresa*, *motivo del reclamo*.",
    DOC_CONTR_ALQ:   "Indica: *Arrendador*, *Inquilino*, *Monto mensual*, *Duración*.",
    DOC_CARTA_PODER: "Indica: *Otorgante*, *Apoderado*, *Objeto del poder*.",
    DOC_DIVORCIO:    "Indica: *Nombres de ambos*, *régimen de bienes*, *acuerdo de hijos (si aplica)*."
  };
  const title = LEGAL_DOCS.find(d => d.id === docId)?.title || "Documento";
  return sendButtons(to, `🧾 *${title}*\n${prompts[docId] || "Indica los datos requeridos."}`, [BTN_BACK]);
}
async function legalDocPreview(to, payloadText) {
  // guardar payload y mostrar vista previa protegida + precio + QR
  const st = g(to);
  const doc = LEGAL_DOCS.find(d => d.id === st.docType);
  set(to, { step: "doc_pay", docPayload: { text: payloadText } });

  await sendImage(to, DOC_PREVIEW, "🔒 Vista previa protegida (demo)");
  await sendText(to, `🧾 *${doc?.title || "Documento"}*\nDatos: ${payloadText}\n💰 Precio: *${doc?.price || "—"} Bs*`);
  await sendImage(to, PAYMENT_QR, "💳 Escanea el QR para pagar");
  return sendButtons(to, "Cuando pagues, confirma:", [{ id: "LEGAL_DOC_PAGADO", title: "✅ Pagado" }, BTN_BACK]);
}
async function legalDocDeliver(to) {
  const st = g(to);
  const doc = LEGAL_DOCS.find(d => d.id === st.docType);
  clear(to);
  const fakeId = Math.random().toString(36).slice(2, 10);
  const link = `${DOC_BASE}${fakeId}`; // simulado: enlace 24h
  await sendText(
    to,
    `✅ *Pago recibido*\nTu documento *${doc?.title}* está listo.\n` +
    `👉 *Descargar (link activo 24h):* ${link}\n\n` +
    "Incluye una revisión gratuita de 10 minutos con abogado."
  );
  return sendButtons(to, "¿Deseas otra acción?", [BTN_BACK]);
}

// --- Citas con abogado (área → horario → abogado → pago → confirmación) ---
async function legalCitaAreas(to) {
  set(to, { step: "cita_area", legalMode: "cita" });
  const rows = [
    { id: "LEGAL_AREA_laboral", title: "Laboral", description: "Despidos, beneficios" },
    { id: "LEGAL_AREA_civil",   title: "Civil",   description: "Contratos, deudas" }
  ];
  return sendList(to, "Áreas legales", "Elige el área para ver horarios disponibles:", rows, "Ver áreas");
}
async function legalCitaSlots(to, areaKey) {
  const spec = LEGAL_CITAS[areaKey];
  if (!spec) return sendText(to, "No hay horarios para esa área (demo).");
  set(to, { step: "cita_slot", citaArea: areaKey });
  const rows = spec.slots.map(s => ({ id: `LEGAL_SLOT_${s.id}`, title: s.label, description: "Elegir horario" }));
  return sendList(to, `Horarios — ${cap(areaKey)}`, "Selecciona un horario:", rows, "Horarios");
}
async function legalCitaLawyers(to) {
  const st = g(to);
  const spec = LEGAL_CITAS[st.citaArea];
  set(to, { step: "cita_lawyer" });
  const rows = spec.lawyers.map(l => ({ id: `LEGAL_LAW_${l.id}`, title: l.name, description: "Disponible" }));
  return sendList(to, `Abogados — ${cap(st.citaArea)}`, `Horario: ${formatSlot(st.citaSlot)}`, rows, "Elegir abogado");
}
async function legalCitaConfirm(to) {
  const st = g(to);
  set(to, { step: "cita_confirm" });
  return sendButtons(
    to,
    `Confirmar cita legal:\n• Área: *${cap(st.citaArea)}*\n• Horario: *${formatSlot(st.citaSlot)}*\n• Abogado: *${st.citaLawyerName}*\n\n💰 Consulta: 70 Bs`,
    [{ id: "LEGAL_CITA_OK", title: "✅ Confirmar" }, BTN_BACK]
  );
}
async function legalCitaPay(to) {
  await sendImage(to, PAYMENT_QR, "💳 Escanea el QR para confirmar tu cita");
  return sendButtons(to, "Cuando pagues, confirma:", [{ id: "LEGAL_CITA_PAGADO", title: "✅ Pagado" }, BTN_BACK]);
}
async function legalCitaFinish(to) {
  const st = g(to);
  clear(to);
  await sendText(
    to,
    `✅ *Cita legal confirmada*\n• Área: *${cap(st.citaArea)}*\n• Horario: *${formatSlot(st.citaSlot)}*\n• Abogado: *${st.citaLawyerName}*\n\n` +
    "Recibirás el enlace de reunión 30 minutos antes."
  );
  return sendButtons(to, "¿Deseas otra acción?", [BTN_BACK]);
}

// ---------- WEBHOOK VERIFY ----------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

// ---------- WEBHOOK POST ----------
app.post("/webhook", async (req, res) => {
  try {
    const entry  = req.body?.entry?.[0];
    const value  = entry?.changes?.[0]?.value;

    // Ignora statuses (delivered/read) y sigue
    if (value?.statuses) return res.sendStatus(200);

    const msg = value?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    // Anti-echo / anti-dup
    const from = msg.from;
    const businessPhoneId = value?.metadata?.phone_number_id;
    if (msg.from === businessPhoneId) return res.sendStatus(200);
    if (dedupe(msg.id)) return res.sendStatus(200);

    const type = msg.type;

    // -------- INTERACTIVE (buttons/list) --------
    if (type === "interactive") {
      const id = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id;
      if (!id) return res.sendStatus(200);

      // Global back
      if (id === "MENU_BACK") { await menuPrincipal(from); return res.sendStatus(200); }

      // Menú principal
      if (id === "MENU_PLANES")  { await menuPlanes(from); return res.sendStatus(200); }
      if (id === "MENU_DEMOS")   { await menuDemos(from);  return res.sendStatus(200); }
      if (id === "MENU_ASESOR")  { await sendText(from, "📞 Asesor: *+591 72296430*"); return res.sendStatus(200); }

      // Planes
      if (["PLAN_BASIC","PLAN_PRO","PLAN_PREMIUM"].includes(id)) {
        await sendText(from, textPlan(id));
        await sendButtons(from, "¿Deseas hablar con un asesor?", [
          { id: "MENU_ASESOR", title: "☎️ Sí, asesor" },
          BTN_BACK
        ]);
        return res.sendStatus(200);
      }

      // Demos intro
      if (id === "DEMO_FOOD_INTRO")  return foodIntro(from);
      if (id === "DEMO_MEDI_INTRO")  return mediIntro(from);
      if (id === "DEMO_LEGAL_INTRO") return legalIntro(from);

      // Food
      if (id === "FOOD_MENU")     return foodShowMenu(from);
      if (id === "FOOD_TIPEAR")   return foodAskPedido(from);
      if (id === "FOOD_PEDIDO")   return foodAskPedido(from);
      if (id === "FOOD_LOCAL")    return foodAskHoraLocal(from);
      if (id === "FOOD_DELIVERY") return foodAskDireccion(from);
      if (id === "FOOD_PAGADO")   return foodFinish(from);

      // Medi
      if (id.startsWith("MEDI_AREA_")) {
        const areaKey = id.replace("MEDI_AREA_", "");
        return mediShowSlots(from, areaKey);
      }
      if (id.startsWith("MEDI_SLOT_")) {
        const slotId = id.replace("MEDI_SLOT_", "");
        set(from, { slot: slotId });
        return mediShowDoctors(from);
      }
      if (id.startsWith("MEDI_DOC_")) {
        const doctorId = id.replace("MEDI_DOC_", "");
        const st = g(from);
        const spec = MEDI_DATA[st.area] || { doctors: [] };
        const doc = spec.doctors.find(d => d.id === doctorId);
        set(from, { doctorId, doctorName: doc?.name || "Médico asignado" });
        await mediConfirm(from);
        return mediPay(from);
      }
      if (id === "MEDI_OK")       return mediPay(from);
      if (id === "MEDI_PAGADO")   return mediFinish(from);

      // Legal
      if (id === "LEGAL_CONSULT") return legalConsultExplain(from);
      if (id === "LEGAL_DOCS")    return legalDocsList(from);
      if (id.startsWith("LEGAL_DOC_")) {
        const did = id.replace("LEGAL_DOC_","");
        return legalDocCollect(from, did);
      }
      if (id === "LEGAL_CITAS")   return legalCitaAreas(from);
      if (id.startsWith("LEGAL_AREA_")) {
        const areaKey = id.replace("LEGAL_AREA_", "");
        return legalCitaSlots(from, areaKey);
      }
      if (id.startsWith("LEGAL_SLOT_")) {
        const slotId = id.replace("LEGAL_SLOT_","");
        set(from, { citaSlot: slotId });
        return legalCitaLawyers(from);
      }
      if (id.startsWith("LEGAL_LAW_")) {
        const lawId = id.replace("LEGAL_LAW_","");
        const st = g(from);
        const spec = LEGAL_CITAS[st.citaArea] || { lawyers: [] };
        const lw = spec.lawyers.find(x => x.id === lawId);
        set(from, { citaLawyerId: lawId, citaLawyerName: lw?.name || "Abogado asignado" });
        return legalCitaConfirm(from);
      }
      if (id === "LEGAL_CITA_OK")     return legalCitaPay(from);
      if (id === "LEGAL_CITA_PAGADO") return legalCitaFinish(from);
      if (id === "LEGAL_DOC_PAGADO")  return legalDocDeliver(from);

      return res.sendStatus(200);
    }

    // -------- TEXT --------
    if (type === "text") {
      const raw = (msg.text?.body || "").trim();
      const low = raw.toLowerCase();
      const st  = g(from);

      // Comandos globales
      if (["menu","menú","cancelar","inicio","start","volver","parar","hola","hola!","hi"].includes(low)) {
        await menuPrincipal(from);
        return res.sendStatus(200);
      }
      if (low === "planes") { await menuPlanes(from); return res.sendStatus(200); }
      if (low === "demos")  { await menuDemos(from);  return res.sendStatus(200); }

      // Food por texto
      if (st.flow === "food") {
        if (st.step === "pedido")        { await foodAfterPedido(from, raw); return res.sendStatus(200); }
        if (st.step === "hora_local")    { await foodConfirmAndPayLocal(from, raw); return res.sendStatus(200); }
        if (st.step === "direccion")     { await foodConfirmAndPayDelivery(from, raw); return res.sendStatus(200); }
      }

      // Medi por texto
      if (st.flow === "medi") {
        if (st.step === "intro") {
          const key = Object.keys(MEDI_DATA).find(k => k === low);
          if (key) return mediShowSlots(from, key);
          await mediIntro(from);
          return res.sendStatus(200);
        }
        if (st.step === "slot")   { set(from, { slot: raw }); return mediShowDoctors(from); }
        if (st.step === "doctor") {
          const spec = MEDI_DATA[st.area] || { doctors: [] };
          const doc = spec.doctors.find(d => d.name.toLowerCase() === low);
          if (doc) { set(from, { doctorId: doc.id, doctorName: doc.name }); await mediConfirm(from); return mediPay(from); }
          return mediShowDoctors(from);
        }
      }

      // Legal por texto
      if (st.flow === "legal") {
        if (st.step === "consult") {
          return legalConsultAnswer(from, raw);
        }
        if (st.step === "doc_inputs") {
          return legalDocPreview(from, raw);
        }
        if (st.step === "cita_area") {
          const key = Object.keys(LEGAL_CITAS).find(k => k === low);
          if (key) return legalCitaSlots(from, key);
          return legalCitaAreas(from);
        }
      }

      // Fallback
      await sendButtons(
        from,
        "No te entendí 🙈. ¿Qué deseas hacer?",
        [
          { id: "MENU_PLANES", title: "💼 Ver planes" },
          { id: "MENU_DEMOS",  title: "🎬 Probar demos" },
          { id: "MENU_ASESOR", title: "☎️ Asesor" }
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
app.get("/", (_, res) => res.send("✅ SmartBot Bolivia OK — IA + Demos + QR + Legal Docs"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SmartBot Bolivia activo en puerto ${PORT}`));

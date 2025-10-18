import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// Variables de entorno (Render las tiene configuradas)
const token = process.env.WABA_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const port = process.env.PORT || 10000;

// Endpoint de verificación
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const tokenReq = req.query["hub.verify_token"];

  if (mode === "subscribe" && tokenReq === verifyToken) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Endpoint de recepción de mensajes
app.post("/webhook", async (req, res) => {
  const data = req.body;

  if (data.object) {
    const entry = data.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message && message.from) {
      const from = message.from;
      const msgBody = message.text?.body?.toLowerCase() || "";

      console.log("📩 Mensaje recibido:", msgBody);

      if (msgBody.includes("hola")) {
        await sendMenu(from);
      } else if (msgBody.includes("planes") || message.button?.payload === "MENU_PLANES") {
        await sendPlanes(from);
      } else if (msgBody.includes("bots") || message.button?.payload === "MENU_BOTS") {
        await sendBots(from);
      } else if (msgBody.includes("asesor") || message.button?.payload === "ASESOR") {
        await sendText(from, "💬 Puedes contactar con nuestro asesor al *+591 72296430*.");
      } else if (msgBody.includes("horarios") || message.button?.payload === "HORARIOS") {
        await sendText(from, "🕒 Horarios de atención: Lunes a Viernes 8:00–18:00, Sábado 8:00–13:00.");
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// 📍 Funciones de envío
async function sendMenu(to) {
  await sendInteractive(to, "👋 ¡Hola! Bienvenido a *SmartBot Bolivia* 🇧🇴\nElige una opción 👇", [
    { id: "MENU_PLANES", title: "⚙️ Planes SmartBot" },
    { id: "MENU_BOTS", title: "🤖 Bots Personalizados" },
    { id: "ASESOR", title: "💬 Asesor" },
    { id: "HORARIOS", title: "🕒 Horarios" }
  ]);
}

async function sendPlanes(to) {
  const text = `📦 *Planes SmartBot Bolivia*\n
*BÁSICO* 💡
Ideal para negocios pequeños.
- Respuestas automáticas simples
- WhatsApp & Telegram
- Preguntas frecuentes preconfiguradas

*PRO* 🚀
Incluye inteligencia GPT
- IA conversacional (hasta 5000 interacciones)
- Integración con formularios
- Ideal para restaurantes, estudios legales o clínicas

*PREMIUM* 💎
- IA avanzada ilimitada
- Flujos conversacionales personalizados
- Integración con sistemas empresariales`;
  await sendText(to, text);
}

async function sendBots(to) {
  const text = `🤖 *Bots Personalizados SmartBot Bolivia*\n
*LegalBot* ⚖️
Consultas legales 24/7. Redacción automática de documentos según normativa boliviana.

*MediBot* 🏥
Orientación médica, gestión de pacientes, reservas y pagos por QR.

*FoodBot* 🍽️
Pedidos, reservas, gestión de delivery y cobro por QR automatizado.`;
  await sendText(to, text);
}

async function sendText(to, body) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${process.env.WABA_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

async function sendInteractive(to, body, buttons) {
  await axios.post(
    `https://graph.facebook.com/v20.0/${process.env.WABA_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: { buttons: buttons.map(b => ({ type: "reply", reply: b })) }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
}

app.listen(port, () => console.log(`✅ SmartBot Bolivia ejecutándose en puerto ${port}`));

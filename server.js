import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const { WABA_TOKEN, WABA_PHONE_ID, VERIFY_TOKEN } = process.env;

// -------- Utilidad para enviar texto por WhatsApp ----------
async function sendText(to, body) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${WABA_PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WABA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("❌ Error enviando mensaje:", err);
  }
}
// -----------------------------------------------------------

// --------- Webhook VERIFY (GET) ----------------------------
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});
// -----------------------------------------------------------

// --------- Webhook RECEIVE (POST) --------------------------
app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (msg?.from && msg?.type === "text") {
      const from = msg.from;
      const text = (msg.text?.body || "").trim().toLowerCase();

      if (["hola", "hi", "buenas"].includes(text)) {
        await sendText(from, "👋 ¡Hola! Soy SmartBot Bolivia. Escribe *planes*, *asesor* o *horarios*.");
      } else if (text.includes("planes") || text.includes("precios")) {
        await sendText(
          from,
          "💼 *Planes SmartBot Bolivia:*\n" +
            "• Básico: auto-respuestas.\n" +
            "• Pro ⭐: IA conversacional + formularios.\n" +
            "• Premium: IA avanzada + pagos QR + reportes.\n" +
            "¿Quieres una *demo*?"
        );
      } else if (text.includes("asesor")) {
        await sendText(from, "🧑‍💼 Un asesor te contactará en breve. ¡Gracias!");
      } else if (text.includes("horarios")) {
        await sendText(from, "🕒 Lun–Sáb 9:00–19:00. 📍Cochabamba, Tiquipaya. Tel: +591 63859300");
      } else {
        await sendText(from, "🤖 No entendí. Escribe *planes*, *asesor*, *horarios* o *hola*.");
      }
    }

    // WhatsApp requiere 200 siempre
    res.sendStatus(200);
  } catch (e) {
    console.error("❌ Error en webhook:", e);
    res.sendStatus(200);
  }
});
// -----------------------------------------------------------

// --------- Levantar servidor -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SmartBot Bolivia ejecutándose en el puerto ${PORT}`);
});
// -----------------------------------------------------------

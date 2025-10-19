import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// ✅ Endpoint de verificación (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Error de verificación");
  }
});

// ✅ Webhook principal (POST)
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;
    if (data.object === "whatsapp_business_account") {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const phoneNumberId =
        data.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      const from = message?.from;
      const text = message?.text?.body?.toLowerCase();

      if (!text || !phoneNumberId || !from) return res.sendStatus(200);

      console.log(`📩 Mensaje recibido de ${from}: ${text}`);

      let reply = "";

      // ======================
      // MENÚ PRINCIPAL
      // ======================
      if (["hola", "menu", "inicio"].includes(text)) {
        reply =
          "👋 *Bienvenido a SmartBot Bolivia*\n\n🤖 Demos disponibles:\n1️⃣ *FoodBot* 🍽️\n2️⃣ *MediBot* 🩺\n3️⃣ *LegalBot GPT* ⚖️\n\nEscribe el nombre del bot que deseas probar.";
      }

      // ======================
      // 🍽️ FOODBOT
      // ======================
      else if (text.includes("foodbot")) {
        reply =
          "🍽️ *FoodBot*\nTu asistente de pedidos.\n\n1️⃣ Ver menú\n2️⃣ Hacer pedido\n3️⃣ Ver estado del pedido";
      } else if (text.includes("menú") || text.includes("menu")) {
        reply =
          "🥟 *Menú del día:*\n- Salteña de pollo 🐔 (10 Bs)\n- Salteña de carne 🥩 (10 Bs)\n- Fricasé 🌶️ (12 Bs)\n\nEscribe el producto que deseas pedir.";
      } else if (text.includes("pollo") || text.includes("carne") || text.includes("fricasé")) {
        reply = `Perfecto 😋 Has pedido *${text}*.\n¿Confirmas tu pedido? (Escribe *ok* para confirmar)`;
      } else if (text === "ok") {
        reply =
          "✅ Pedido confirmado.\n¿Deseas pagar ahora con QR? (Escribe *ok* para pagar o *no* para luego)";
      } else if (text === "no") {
        reply = "👌 Puedes pagar al recibir tu pedido 🚚\nGracias por usar *FoodBot*.";
      } else if (text.includes("pagar")) {
        reply =
          "💳 QR de pago demo:\nhttps://example.com/qr\n✅ Pago confirmado.\nTu pedido estará listo pronto.\n¿Te gustaría tener un bot así para tu restaurante?";
      }

      // ======================
      // 🩺 MEDIBOT
      // ======================
      else if (text.includes("medibot")) {
        reply =
          "🩺 *MediBot*\nTu asistente médico virtual.\n\n1️⃣ Orientación médica\n2️⃣ Reservar cita";
      } else if (text.includes("orientación") || text.includes("orientacion")) {
        reply =
          "🩺 Ejemplo de orientación:\n‘Para fiebre leve, hidrátate y controla la temperatura.’\n\n(O escribe *cita* para reservar una consulta)";
      } else if (text.includes("cita")) {
        reply =
          "📅 ¿Qué especialidad deseas?\n- Medicina general\n- Odontología\n- Pediatría";
      } else if (text.includes("medicina") || text.includes("odontología") || text.includes("pediatría")) {
        reply =
          "📆 Horario disponible: mañana 10:30.\n¿Confirmas la cita? (Escribe *ok*)";
      } else if (text === "ok cita") {
        reply =
          "✅ Cita confirmada.\n¿Deseas pagar con QR? (Responde *ok* o *no*)";
      }

      // ======================
      // ⚖️ LEGALBOT GPT
      // ======================
      else if (text.includes("legalbot")) {
        reply =
          "⚖️ *LegalBot Bolivia* 🇧🇴\nSoy un asistente jurídico con IA (GPT) entrenado en leyes bolivianas.\n\nPuedes preguntar sobre *despido laboral*, *contrato*, *pensión* o cualquier tema legal.";
      } else if (text.includes("despido")) {
        reply =
          "📑 Según la *LGT*, el despido injustificado da derecho a indemnización.\n¿Deseas redactar una carta formal? (Escribe *ok*)";
      } else if (text.includes("contrato")) {
        reply =
          "📜 Un contrato debe incluir monto, plazo y condiciones (Art. 619 del Código Civil).\n¿Deseas un modelo? (Escribe *ok*)";
      } else if (text.includes("pensión")) {
        reply =
          "👶 La pensión se calcula según los ingresos y necesidades del menor (Código de Familia).\n¿Deseas un modelo de solicitud? (Escribe *ok*)";
      } else if (text.startsWith("tengo") || text.startsWith("quiero") || text.length > 20) {
        reply =
          "🧠 Analizando tu consulta con GPT legal...\n*Ejemplo:*\n‘Según el Art. 12 LGT, el despido sin causa da lugar a indemnización.’\n¿Deseas el documento? (Escribe *ok*)";
      } else if (text === "ok legal") {
        reply =
          "📝 Modelo de documento:\nYo, [nombre], interpongo reclamo conforme al Art. 12 LGT.\n💼 ¿Quieres un bot así para tu estudio jurídico?";
      }

      // ======================
      // RESPUESTA DEFAULT
      // ======================
      else {
        reply =
          "🤖 No entendí tu mensaje.\nEscribe *hola* para ver el menú principal o *legalbot*, *medibot*, *foodbot* para iniciar una demo.";
      }

      // Enviar respuesta al usuario
      await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            text: { body: reply },
          }),
        }
      );

      console.log("✅ Mensaje enviado:", reply);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.sendStatus(500);
  }
});

// ======================
// SERVIDOR
// ======================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🚀 SmartBot Bolivia ejecutándose en el puerto ${PORT}`)
);

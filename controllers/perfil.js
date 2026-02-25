var db = require("../models");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

// Actualizar Alertas del Perfil
async function updateAlertas(req, res) {
  try {
    const { alertas } = req.body;
    // req.user.id es el ID del usuario que tiene la sesión iniciada
    await db.User.update({ alertas: alertas }, { where: { id: req.user.id } });
    res.json({ message: "Alertas actualizadas correctamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar alertas." });
  }
}

// Cambiar Contraseña del Perfil

async function updatePassword(req, res) {
  try {
    const { newPassword } = req.body;
    // Buscamos al usuario en la BD
    const user = await db.User.findByPk(req.user.id);

    // Al asignarle la nueva contraseña, tu modelo User.js se encargará
    // de encriptarla (hashearla) automáticamente si tienes los hooks configurados.
    user.password = newPassword;
    await user.save();

    res.json({ message: "Contraseña actualizada exitosamente." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar la contraseña." });
  }
}

// Solicitar código para cambiar teléfono
async function solicitarTelefono(req, res) {
  try {
        const { nuevoTelefono } = req.body;
        if (!nuevoTelefono) return res.status(400).json({ error: "Debes ingresar un número válido." });

        // Enviamos el código vía WhatsApp usando tu servicio de Twilio Verify
        await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
            .verifications
            .create({ to: nuevoTelefono, channel: 'whatsapp' });

        res.json({ message: "Código enviado. Revisa tu WhatsApp." });
    } catch (error) {
        console.error("Error enviando OTP de cambio de teléfono:", error);
        res.status(500).json({ error: "Error al enviar el código de verificación." });
    }
}

// Verificar código y guardar el nuevo teléfono
async function verificarTelefono(req, res) {
  try {
        const { nuevoTelefono, otpCode } = req.body;

        // Comprobamos con Twilio si el código es el correcto
        const verificationCheck = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
            .verificationChecks
            .create({ to: nuevoTelefono, code: otpCode });

        if (verificationCheck.status !== "approved") {
            return res.status(400).json({ error: "Código inválido o expirado." });
        }

        // Si el código es correcto, actualizamos la base de datos
        await db.User.update({ telefono: nuevoTelefono }, { where: { id: req.user.id } });

        res.json({ message: "¡Tu número ha sido actualizado con éxito!" });
    } catch (error) {
        console.error("Error verificando OTP de teléfono:", error);
        res.status(500).json({ error: "Hubo un error al verificar el código." });
    }
}

module.exports = {
  updateAlertas: updateAlertas,
  updatePassword: updatePassword,
  solicitarTelefono: solicitarTelefono,
  verificarTelefono: verificarTelefono
};

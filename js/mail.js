// Este archivo es como tengo organizado la automatización de envio de correos, con un transportador para Gmail y otro para Outlook365,
// además de para que acceda a mi base de datos para coger los correos y mande a cada uno con su dominio.

const nodemailer = require("nodemailer");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

// Transportadores 
const transportadores = {
  gmail: nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "correo@gmail.com",
      pass: "contra",
    },
    tls: { rejectUnauthorized: false },
  }),
  outlook: nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: "correo@gmail.com",
      pass: "contra",
    },
    tls: { ciphers: "SSLv3" },
  }),
};

// transportador según el dominio
function obtenerTransportadorPorDominio(email) {
  const dominio = email.split("@")[1].toLowerCase();
  if (dominio.includes("gmail")) return transportadores.gmail;
  if (dominio.includes("outlook") || dominio.includes("hotmail")) return transportadores.outlook;
  return transportadores.gmail; // Por defecto
}

async function enviarCorreo() {

  // Leer HTML
  const rutaHTML = "/var/www/html/index.html";
  let contenidoHTML;
  try {
    contenidoHTML = fs.readFileSync(rutaHTML, "utf-8");
  } catch (err) {
    console.error("Error al leer el HTML:", err.message);
    return;
  }

  // Conectarse a la base de datos
  let listaDestinatarios = [];
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "user",
      password: "contraseña",
      database: "basedatos",
    });

    const [rows] = await connection.execute("SELECT correo FROM Suscriptores");
    listaDestinatarios = rows.map(row => row.correo).filter(Boolean);

    await connection.end();

    if (listaDestinatarios.length === 0) {
      console.warn("No hay destinatarios en la base de datos.");
      return;
    }
  } catch (error) {
    console.error("Error con la base de datos:", error.message);
    return;
  }

  // Enviar correos
  for (const email of listaDestinatarios) {
    const transportador = obtenerTransportadorPorDominio(email);

    const mailOptions = {
      from: `"Salón del Cómic" <correo@gmail.com>`,
      to: email,
      subject: " ¡El Salón del Cómic ya está aquí!",
      html: contenidoHTML,
      replyTo: "no-reply@ejemplo.com", // para que no puedan responder
    };

    try {
      const info = await transportador.sendMail(mailOptions);
      console.log(`Correo enviado a ${email} | ID: ${info.messageId}`);
    } catch (error) {
      console.error(`Error al enviar a ${email}:`, error.message);
    }
  }
}

// Ejecutar
enviarCorreo().catch(console.error);

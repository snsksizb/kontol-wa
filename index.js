const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeInMemoryStore,
  PHONENUMBER_MCC
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");

// ======== GANTI NOMOR KAMU DISINI ========
const PHONE_NUMBER = "6281234567890"; // <--- UBAH JADI NOMOR KAMU
// ========================================

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");

  const conn = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false, // ← MATIKAN QR
    mobile: false,
    auth: state,
    browser: ["Termux", "Bot", "1.0"]
  });

  store.bind(conn.ev);

  // ===== PAIRING CODE =====
  if (!conn.authState.creds.registered) {
    if (!Object.keys(PHONENUMBER_MCC).some(v => PHONE_NUMBER.startsWith(v))) {
      console.log(chalk.red("❌ Gunakan kode negara, contoh: 6281234567890"));
      process.exit(1);
    }

    setTimeout(async () => {
      const code = await conn.requestPairingCode(PHONE_NUMBER);
      const pairingCode = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log(chalk.bgGreen.black("\n📱 PAIRING CODE:"), chalk.bold(pairingCode));
      console.log(chalk.yellow("⏳ Masukkan kode di WhatsApp → Linked devices → Link a device\n"));
    }, 3000);
  }
  // ========================

  conn.ev.on("creds.update", saveCreds);

  // Auto reply
  conn.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.remoteJid === "status@broadcast") return;

    const msgText = m.message.conversation || m.message.extendedTextMessage?.text || "";

    if (msgText.toLowerCase() === "menu") {
      await conn.sendMessage(m.key.remoteJid, { text: "✅ Bot aktif! Fitur akan ditambahkan." });
    }

    if (msgText.toLowerCase() === ".ping") {
      await conn.sendMessage(m.key.remoteJid, { text: "🏓 Pong!" });
    }

    if (msgText.toLowerCase() === "bot") {
      await conn.sendMessage(m.key.remoteJid, { text: "👋 Hai, bot siap membantu!" });
    }
  });
}

startBot().catch(console.error);

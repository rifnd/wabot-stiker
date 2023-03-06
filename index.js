const {
default: makeWASocket,
useMultiFileAuthState,
downloadMediaMessage,
DisconnectReason
} = require("baileys");
const { Boom } = require("@hapi/boom");
const P = require("pino");

// Exif
const {writeExifImg}= require("./lib/exif.js");

// Session
const { state, saveCreds } = useMultiFileAuthState("./session");

const logger = P();
function runBot() {
const sock = makeWASocket({
auth: state,
printQRInTerminal: true,
logger: P({
level: "silent"
})
});

// Connection
sock.ev.on("connection.update", ({ connection, lastDisconnect })=> {
if (connection === "close") {
const error = new Boom(lastDisconnect.error);
const alasanError = error?.output?.statusCode;
if (alasanError === DisconnectReason.loggedOut) {
sock.logout();
} else {
runBot();
}
} else {
console.log("connection opened");
}
});

sock.ev.on("messages.upsert",
async ({ messages, type })=> {
const msg = messages[0];
if (!msg.message || msg.key.remoteJid === "status@broadcast" || msg.key.fromMe||!msg.message.imageMessage)return;
let caption = msg.message.imageMessage.caption;
let buffer = await downloadMediaMessage(msg, "buffer", {}, { logger });
buffer = await writeExifImg(buffer, {packname:"Sticker", author:"@naando.io"});

// Command
if (caption === '.sticker') {
sock.sendMessage(msg.key.remoteJid, {sticker:{url: buffer}});
}
});

sock.ev.on("creds.update",
saveCreds);
}

runBot();

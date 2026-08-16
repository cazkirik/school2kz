import tls from 'node:tls';

const HOST = process.env.SMTP_HOST || '';
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || '';
const PASS = process.env.SMTP_PASS || '';
const FROM = process.env.SMTP_FROM || USER;

const enabled = Boolean(HOST && USER && PASS);

function encodeBase64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

function sendCommand(socket: tls.TLSSocket, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      if (/^\d{3} /.test(text)) {
        socket.off('data', onData);
        resolve(text);
      }
    };
    socket.on('data', onData);
    socket.once('error', reject);
    socket.write(command + '\r\n');
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!enabled) return;

  const socket = tls.connect({ host: HOST, port: PORT, servername: HOST });

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  try {
    await sendCommand(socket, `EHLO ${HOST}`);
    await sendCommand(socket, `AUTH LOGIN`);
    await sendCommand(socket, encodeBase64(USER));
    await sendCommand(socket, encodeBase64(PASS));
    await sendCommand(socket, `MAIL FROM:<${FROM}>`);
    await sendCommand(socket, `RCPT TO:<${to}>`);
    await sendCommand(socket, 'DATA');
    socket.write(
      `Subject: =?UTF-8?B?${encodeBase64(subject)}?=\r\n` +
        'MIME-Version: 1.0\r\n' +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        'Content-Transfer-Encoding: 8bit\r\n' +
        `\r\n${html}\r\n.\r\n`,
    );
    await sendCommand(socket, 'QUIT');
  } finally {
    socket.destroy();
  }
}

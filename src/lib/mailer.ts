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

interface SmtpResponse {
  code: number;
  text: string;
}

function readResponse(socket: tls.TLSSocket): Promise<SmtpResponse> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timeout = setTimeout(() => {
      socket.off('data', onData);
      reject(new Error('SMTP timeout'));
    }, 15000);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() ?? '';
      for (const raw of lines) {
        const m = raw.match(/^(\d{3})[ -](.*)$/);
        if (m) {
          clearTimeout(timeout);
          socket.off('data', onData);
          resolve({ code: Number(m[1]), text: m[2] });
          return;
        }
      }
    };
    socket.on('data', onData);
  });
}

async function command(socket: tls.TLSSocket, cmd: string, expected: number[]): Promise<void> {
  socket.write(cmd + '\r\n');
  const res = await readResponse(socket);
  if (!expected.includes(res.code)) {
    throw new Error(`SMTP ${cmd.split(' ')[0]}: ${res.code} ${res.text}`);
  }
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!enabled) return;

  const socket = tls.connect({ host: HOST, port: PORT, servername: HOST });

  await new Promise<void>((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  try {
    const banner = await readResponse(socket);
    if (banner.code !== 220) throw new Error(`SMTP banner: ${banner.code} ${banner.text}`);

    await command(socket, `EHLO ${HOST}`, [250]);
    await command(socket, `AUTH PLAIN ${encodeBase64(`\0${USER}\0${PASS}`)}`, [235]);
    await command(socket, `MAIL FROM:<${FROM}>`, [250]);
    await command(socket, `RCPT TO:<${to}>`, [250, 251]);
    await command(socket, 'DATA', [354]);
    socket.write(
      `Subject: =?UTF-8?B?${encodeBase64(subject)}?=\r\n` +
        'MIME-Version: 1.0\r\n' +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        'Content-Transfer-Encoding: 8bit\r\n' +
        `\r\n${html}\r\n.\r\n`,
    );
    const done = await readResponse(socket);
    if (done.code !== 250) throw new Error(`SMTP DATA: ${done.code} ${done.text}`);
    await command(socket, 'QUIT', [221]);
  } finally {
    socket.destroy();
  }
}

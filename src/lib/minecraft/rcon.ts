import { Socket } from "node:net";

const TYPE_AUTH = 3;
const TYPE_AUTH_RESPONSE = 2;
const TYPE_EXEC_COMMAND = 2;

export interface RconPacket {
  id: number;
  type: number;
  body: string;
}

export function encodePacket(id: number, type: number, body: string): Buffer {
  const bodyBuffer = Buffer.from(body, "utf8");
  const payloadLength = 4 + 4 + bodyBuffer.length + 2;
  const packet = Buffer.alloc(4 + payloadLength);
  packet.writeInt32LE(payloadLength, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  bodyBuffer.copy(packet, 12);
  packet.writeUInt8(0, 12 + bodyBuffer.length);
  packet.writeUInt8(0, 13 + bodyBuffer.length);
  return packet;
}

/**
 * Splits complete RCON packets off the front of a buffer that may contain a
 * partial packet at the end (TCP gives no framing guarantees).
 */
export function decodePackets(buffer: Buffer): { packets: RconPacket[]; remaining: Buffer } {
  const packets: RconPacket[] = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const payloadLength = buffer.readInt32LE(offset);
    const packetEnd = offset + 4 + payloadLength;
    if (packetEnd > buffer.length) {
      break;
    }
    const id = buffer.readInt32LE(offset + 4);
    const type = buffer.readInt32LE(offset + 8);
    const body = buffer.toString("utf8", offset + 12, packetEnd - 2);
    packets.push({ id, type, body });
    offset = packetEnd;
  }
  return { packets, remaining: buffer.subarray(offset) };
}

/**
 * Authenticates against a Source RCON server and sends a single command.
 * Resolves with the command's response body.
 */
export function sendRconCommand(
  host: string,
  port: number,
  password: string,
  command: string,
  timeoutMs = 10_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let authenticated = false;

    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs, () => fail(new Error(`RCON connection to ${host}:${port} timed out`)));
    socket.once("error", fail);

    socket.once("connect", () => {
      socket.write(encodePacket(1, TYPE_AUTH, password));
    });

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const { packets, remaining } = decodePackets(buffer);
      buffer = remaining;
      for (const packet of packets) {
        if (!authenticated) {
          if (packet.type === TYPE_AUTH_RESPONSE) {
            if (packet.id === -1) {
              fail(new Error("RCON authentication failed"));
              return;
            }
            authenticated = true;
            socket.write(encodePacket(2, TYPE_EXEC_COMMAND, command));
          }
          continue;
        }
        socket.destroy();
        resolve(packet.body);
        return;
      }
    });

    socket.connect(port, host);
  });
}

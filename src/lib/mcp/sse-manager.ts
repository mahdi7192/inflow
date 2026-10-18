import { ActiveAgentStream } from "./types";

declare global {
  var __inflowAgentStreams: Map<string, ActiveAgentStream> | undefined;
}

function getStreamMap(): Map<string, ActiveAgentStream> {
  if (!global.__inflowAgentStreams) {
    global.__inflowAgentStreams = new Map<string, ActiveAgentStream>();
  }
  return global.__inflowAgentStreams;
}

const encoder = new TextEncoder();

export class AgentStreamManager {
  /**
   * Registers an active SSE client stream.
   */
  static register(stream: ActiveAgentStream): void {
    const map = getStreamMap();
    map.set(stream.sessionId, stream);
  }

  /**
   * Unregisters and removes a closed SSE client stream.
   */
  static unregister(sessionId: string): void {
    const map = getStreamMap();
    map.delete(sessionId);
  }

  /**
   * Returns all active streams listening for a specific Instagram account.
   */
  static getStreamsForAccount(accountUsername: string): ActiveAgentStream[] {
    const map = getStreamMap();
    const result: ActiveAgentStream[] = [];
    const target = accountUsername.toLowerCase();

    for (const stream of map.values()) {
      if (
        stream.accountUsername.toLowerCase() === target ||
        stream.accountUsername === "*"
      ) {
        result.push(stream);
      }
    }
    return result;
  }

  /**
   * Broadcasts a named event and payload to all active agent streams for an account.
   * Returns the number of clients that successfully received the event.
   */
  static broadcastToAccount(
    accountUsername: string,
    eventName: string,
    data: unknown
  ): number {
    const streams = this.getStreamsForAccount(accountUsername);
    if (streams.length === 0) return 0;

    const payloadString =
      typeof data === "string" ? data : JSON.stringify(data);
    const message = `event: ${eventName}\ndata: ${payloadString}\n\n`;
    const encoded = encoder.encode(message);

    let deliveredCount = 0;
    for (const stream of streams) {
      try {
        stream.controller.enqueue(encoded);
        deliveredCount++;
      } catch {
        // Stream might be broken or closed; unregister
        this.unregister(stream.sessionId);
      }
    }

    return deliveredCount;
  }

  /**
   * Sends a keepalive ping to all active SSE streams.
   */
  static broadcastPing(): void {
    const map = getStreamMap();
    if (map.size === 0) return;

    const pingMessage = `event: ping\ndata: {"timestamp":${Date.now()}}\n\n`;
    const encoded = encoder.encode(pingMessage);

    for (const stream of map.values()) {
      try {
        stream.controller.enqueue(encoded);
        stream.lastPingAt = new Date();
      } catch {
        map.delete(stream.sessionId);
      }
    }
  }

  /**
   * Returns total connected agents count.
   */
  static getActiveCount(): number {
    return getStreamMap().size;
  }

  /**
   * Checks whether a specific account currently has at least one active SSE connection.
   */
  static isAccountConnected(accountUsername: string): boolean {
    return this.getStreamsForAccount(accountUsername).length > 0;
  }
}

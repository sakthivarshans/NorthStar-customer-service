/**
 * Marks the single assistant message that just arrived so its AudioPlayer can speak it automatically.
 * History loaded from the server never auto-plays (that would fire one TTS call per old message).
 */
let pendingId: string | null = null;

export const markAutoSpeak = (messageId: string): void => {
  pendingId = messageId;
};

/** True exactly once for the marked message. */
export const consumeAutoSpeak = (messageId?: string): boolean => {
  if (messageId && pendingId === messageId) {
    pendingId = null;
    return true;
  }
  return false;
};

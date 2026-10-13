import * as Y from "yjs";

export function decodeVersionState(state: string): Y.Doc {
  const document = new Y.Doc();
  try {
    const binary = Uint8Array.from(
      atob(state),
      (character) => character.charCodeAt(0),
    );
    Y.applyUpdate(document, binary);
    return document;
  } catch (error) {
    document.destroy();
    throw error;
  }
}

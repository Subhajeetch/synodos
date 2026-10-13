import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { decodeVersionState } from "./version-snapshot";

describe("decodeVersionState", () => {
  it("decodes a snapshot into a separate document without changing the source", () => {
    const source = new Y.Doc();
    const sourceText = new Y.XmlText();
    sourceText.insert(0, "Historical content");
    const paragraph = new Y.XmlElement("paragraph");
    paragraph.insert(0, [sourceText]);
    source.getXmlFragment("default").insert(0, [paragraph]);
    source.getMap<string>("pageMetadata").set("root", "Overview");

    const encoded = btoa(
      Array.from(Y.encodeStateAsUpdate(source), (byte) =>
        String.fromCharCode(byte),
      ).join(""),
    );
    const preview = decodeVersionState(encoded);
    const before = Y.encodeStateAsUpdate(source);
    const previewParagraph = preview.getXmlFragment("default").get(0);
    const previewText =
      previewParagraph instanceof Y.XmlElement
        ? previewParagraph.get(0)
        : undefined;

    expect(preview).not.toBe(source);
    expect(preview.getMap<string>("pageMetadata").get("root")).toBe("Overview");
    expect(previewText).toBeInstanceOf(Y.XmlText);
    if (!(previewText instanceof Y.XmlText)) {
      throw new Error("The preview paragraph text was not decoded");
    }
    previewText.delete(0, previewText.length);
    previewText.insert(0, "Changed only in preview");

    expect(sourceText.toString()).toBe("Historical content");
    expect(Y.encodeStateAsUpdate(source)).toEqual(before);
    preview.destroy();
    source.destroy();
  });

  it("rejects malformed binary state without leaking its Y.Doc", () => {
    expect(() => decodeVersionState("not base64 data")).toThrow();
  });
});

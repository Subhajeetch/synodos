import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import { replaceDocumentState } from "./version-restore-listener";

function setDocumentContent(
  document: Y.Doc,
  text: string,
  title: string,
  migrationValue: boolean,
) {
  const xmlText = new Y.XmlText();
  xmlText.insert(0, text);
  const paragraph = new Y.XmlElement("paragraph");
  paragraph.insert(0, [xmlText]);
  document.getXmlFragment("default").insert(0, [paragraph]);
  document.getMap<string>("pageMetadata").set("root", title);
  document.getMap<boolean>("editorMigrations").set("explicitPagesV2", migrationValue);
}

function firstParagraphText(document: Y.Doc) {
  const first = document.getXmlFragment("default").toArray()[0];
  assert.ok(first instanceof Y.XmlElement);
  const text = first.toArray()[0];
  assert.ok(text instanceof Y.XmlText);
  return text.toString();
}

test("restore replaces content and document metadata from an isolated Y.Doc", () => {
  const live = new Y.Doc();
  const snapshot = new Y.Doc();
  setDocumentContent(live, "current text", "Current title", true);
  setDocumentContent(snapshot, "restored text", "Restored title", false);

  replaceDocumentState(live, snapshot);

  assert.equal(firstParagraphText(live), "restored text");
  assert.equal(live.getMap<string>("pageMetadata").get("root"), "Restored title");
  assert.equal(
    live.getMap<boolean>("editorMigrations").get("explicitPagesV2"),
    false,
  );
  assert.equal(firstParagraphText(snapshot), "restored text");
  live.destroy();
  snapshot.destroy();
});

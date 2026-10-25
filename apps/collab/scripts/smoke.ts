import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const COLLAB_URL = process.env.COLLAB_URL ?? "ws://localhost:1234";
const ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const EMAIL = process.env.SMOKE_EMAIL ?? "test@example.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "password1234";

const [command, target, ...rest] = process.argv.slice(2);

function usage(): never {
  console.error(`Usage:
  smoke write <docId|new> <text...>   append a line (creates a doc if "new")
  smoke read  <docId>                 print the stored text
  smoke watch <docId>                 stay connected, print on every change

Env: COLLAB_URL (default ws://localhost:1234), SMOKE_EMAIL, SMOKE_PASSWORD`);
  process.exit(1);
}

async function signIn(): Promise<string> {
  const post = (path: string, body: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify(body),
    });

  let res = await post("/api/auth/sign-in/email", {
    email: EMAIL,
    password: PASSWORD,
  });
  if (!res.ok) {
    res = await post("/api/auth/sign-up/email", {
      email: EMAIL,
      password: PASSWORD,
      name: "Smoke Test",
    });
  }
  if (!res.ok)
    throw new Error(`Sign-in failed: ${res.status} ${await res.text()}`);

  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function getToken(cookie: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/token`, {
    headers: { cookie, Origin: ORIGIN },
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("No token in response");
  return data.token;
}

async function createDoc(cookie: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ title: "Smoke test" }),
  });
  if (!res.ok)
    throw new Error(`Create doc failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

function connect(docId: string, token: string) {
  const ydoc = new Y.Doc();
  let markSynced!: () => void;
  const synced = new Promise<void>((resolve) => (markSynced = resolve));

  const provider = new HocuspocusProvider({
    url: COLLAB_URL,
    name: docId,
    document: ydoc,
    token,
    onSynced: () => markSynced(),
    onAuthenticationFailed: ({ reason }) => {
      console.error("Auth failed:", reason);
      process.exit(1);
    },
  });

  return { text: ydoc.getText("smoke"), provider, synced };
}

async function main() {
  if (!target || !["write", "read", "watch"].includes(command ?? "")) usage();

  const cookie = await signIn();
  const token = await getToken(cookie);
  const docId = target === "new" ? await createDoc(cookie) : target;
  console.log(`doc: ${docId}   server: ${COLLAB_URL}`);

  const { text, provider, synced } = connect(docId, token);
  await synced;

  if (command === "write") {
    text.insert(text.length, `${rest.join(" ")}\n`);
    await new Promise((r) => setTimeout(r, 1000)); // let the update reach the server
    console.log("written");
    provider.destroy();
    process.exit(0);
  }

  if (command === "read") {
    console.log("--- content ---");
    console.log(text.toString() || "(empty)");
    provider.destroy();
    process.exit(0);
  }

  // watch
  console.log("--- content ---");
  console.log(text.toString() || "(empty)");
  text.observe(() => {
    console.log("--- updated ---");
    console.log(text.toString());
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

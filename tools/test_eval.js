const require_json = require("fs").readFileSync("app/elements.json","utf8");
const fs = require("fs"), vm = require("vm");
const ctx = { console, structuredClone, document: { addEventListener() {}, querySelector() { return null; }, documentElement: { style: { setProperty() {} } } },
  localStorage: { getItem() { return null; }, setItem() {} }, fetch: () => new Promise(() => {}), navigator: {}, window: { CompressionStream, addEventListener() {} }, CompressionStream, DecompressionStream, Blob, Response, TextEncoder, TextDecoder, btoa, atob, location: { origin: "http://localhost:8790", pathname: "/" } };
vm.createContext(ctx);
ctx.require_json = require_json;
const src = fs.readFileSync("app/rules.js", "utf8") + "\n" + fs.readFileSync("app/app.js", "utf8") + "\n" + fs.readFileSync("tools/test_body.js", "utf8");
vm.runInContext(src, ctx);

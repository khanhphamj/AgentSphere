import { health } from "./agentbaseMemory.js";

health().then(h => {
  console.log(JSON.stringify(h, null, 2));
  process.exit(h.ok ? 0 : 1);
}).catch(e => {
  console.error(`✗ ${e.message}`);
  process.exit(1);
});

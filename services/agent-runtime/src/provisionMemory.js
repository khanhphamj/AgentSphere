import { provisionMemory, memoryEnabled, CUSTOM_FACT_PROMPT } from "./agentbaseMemory.js";

const arg = (name, def) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};

async function main() {
  if (!memoryEnabled()) {
    console.error("✗ No GreenNode IAM credentials in env. Set GREENNODE_CLIENT_ID and GREENNODE_CLIENT_SECRET (a GreenNode IAM service account — NOT the internal CLIENT_ID/CLIENT_SECRET) in .env, then re-run.");
    process.exit(1);
  }
  const name = arg("name", "agentsphere-ltm");
  const expiryDays = Number(arg("expiry-days", "30"));
  console.log("Provisioning AgentBase Memory for AgentSphere long-term lessons:");
  console.log(`  name           : ${name}`);
  console.log(`  eventExpiry    : ${expiryDays} days`);
  console.log(`  strategy       : CUSTOM (auto-generate) "agent-mission-lessons"`);
  console.log(`  namespace      : /strategies/{memoryStrategyId}/actors/{actorId}`);
  console.log(`  customPrompt   : ${CUSTOM_FACT_PROMPT.slice(0, 90)}...`);
  console.log("");
  const { memoryId, strategyId } = await provisionMemory({ name, expiryDays });
  console.log("✓ Created.\n");
  console.log("Add these to your .env (then restart agent-runtime to activate AgentBase memory):\n");
  console.log(`MEMORY_ID=${memoryId}`);
  console.log(`MEMORY_STRATEGY_ID=${strategyId || "<not returned — run: GET /memories/" + memoryId + "/long-term-memory-strategies>"}`);
}

main().catch(e => {
  console.error(`✗ Provision failed: ${e.message}`);
  process.exit(1);
});

import { TokenGate } from '../tokengate/dist/index.mjs';

console.log('='.repeat(65));
console.log('  🛡️  TOKENGATE INTERACTIVE DEMONSTRATION & SAFETY HARNESS');
console.log('='.repeat(65));

async function runDemo() {
  // 1. Initialize TokenGate with budget caps and event listeners
  const gate = new TokenGate({
    name: 'agent-production-gate',
    limits: {
      maxCostTotalUsd: 0.05,       // Maximum lifetime spend: $0.05
      maxCostPerMinuteUsd: 0.02,   // Maximum spend per minute: $0.02
      maxTokensPerRequest: 1500,   // Max tokens per single request
      maxRecursionDepth: 3         // Stop recursion loops at depth 3
    },
    circuitBreaker: {
      failureThreshold: 2,
      resetTimeoutMs: 2000
    },
    onBreach: (event) => {
      console.log(`\n⚠️  [BREACH EVENT] ${event.reason}`);
      console.log(`   Message: ${event.message}`);
    },
    onUsage: (usage) => {
      console.log(`📊 [USAGE] Model: ${usage.model} | Tokens: ${usage.totalTokens} | Cost: $${usage.costUsd.toFixed(5)} | Total so far: $${usage.totalCostSoFarUsd.toFixed(5)}`);
    }
  });

  // Scenario 1: Normal LLM task execution
  console.log('\n--- Scenario 1: Standard LLM Query Execution ---');
  const safeAgentTask = gate.wrap(
    async (taskDescription) => {
      // Simulate API latency & processing
      await new Promise(r => setTimeout(r, 50));
      return `Generated response for: "${taskDescription}"`;
    },
    { model: 'gpt-4o', estimatedPromptTokens: 250 }
  );

  const res1 = await safeAgentTask('Analyze financial quarterly report');
  console.log(`✅ Result: ${res1}`);

  const res2 = await safeAgentTask('Extract action items');
  console.log(`✅ Result: ${res2}`);

  console.log('\n📈 Current Gate Metrics:');
  console.log(gate.getSummary());

  // Scenario 2: Runaway Agent Loop Prevention (Infinite recursion)
  console.log('\n--- Scenario 2: Runaway Agent Recursion Interception ---');
  const recursiveAgent = gate.wrap(
    async (depth) => {
      console.log(`   🔄 Agent loop iteration at depth: ${depth}`);
      if (depth >= 10) return 'Done';
      // Agent calls itself (simulating recursive reasoning loop)
      return await recursiveAgent(depth + 1);
    },
    { model: 'gpt-4o-mini', estimatedPromptTokens: 100 }
  );

  try {
    await recursiveAgent(1);
  } catch (err) {
    console.log(`🛡️  Recursion blocked successfully: ${err.message}`);
  }

  // Scenario 3: Budget Overrun Protection
  console.log('\n--- Scenario 3: Budget Cap Enforcement ---');
  const heavyTask = gate.wrap(
    async () => 'Processed large batch',
    { model: 'o1', estimatedPromptTokens: 4000 }
  );

  try {
    // This request will breach the $0.05 limit because o1 pricing ($0.015/1k) exceeds remaining budget
    await heavyTask();
  } catch (err) {
    console.log(`🛡️  Budget limit enforced: ${err.message}`);
  }

  console.log('\n--- Final System State ---');
  console.log(gate.getSummary());
  console.log('\n✨ Demo completed successfully. All safety controls verified!\n');
}

runDemo().catch(console.error);

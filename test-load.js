try {
  const Node = require('./dist/nodes/AzureAnthropic/AzureAnthropic.node.js').AzureAnthropic;
  
  // Note: We cannot easily verify runtime behavior of the SDK call without real creds/mocking,
  // but we can check if the class instantiates and the module loads with the new dependency.
  
  const nodeInstance = new Node();

  console.log('✅ Node loaded successfully with @anthropic-ai/foundry-sdk');
  console.log('   Display Name:', nodeInstance.description.displayName);
  
} catch (error) {
  console.error('❌ Error loading modules:', error);
  process.exit(1);
}

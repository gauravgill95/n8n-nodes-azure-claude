import { AzureAnthropic } from './dist/nodes/AzureAnthropic/AzureAnthropic.node.js';
import { AzureAnthropicApi } from './dist/credentials/AzureAnthropicApi.credentials.js';

// Mock n8n functions for supplyData testing
const mockCredentials = {
  apiKey: 'fake-key',
  baseUrl: 'https://fake-endpoint.azure.com/anthropic/',
};

const mockSupplyDataFunctions = {
  getCredentials: async () => mockCredentials,
  getNodeParameter: (paramName) => {
    const params = {
      deploymentName: 'claude-test',
      apiVersion: '2023-06-01',
      maxTokens: 100,
      temperature: 0.7,
    };
    return params[paramName];
  },
};

(async () => {
  try {
    const node = new AzureAnthropic();
    console.log('✅ Node instantiated:', node.description.displayName);

    if (node.supplyData) {
      console.log('⏳ Testing supplyData...');
      const result = await node.supplyData.call(mockSupplyDataFunctions, 0);
      
      if (result.response && result.response.constructor.name === 'ChatAnthropicFoundry') {
         console.log('✅ supplyData returned a ChatAnthropicFoundry instance');
         console.log('   Model Name:', result.response.modelName);
      } else {
         console.error('❌ supplyData did not return expected model instance', result);
         process.exit(1);
      }
    } else {
      console.error('❌ Node missing supplyData method');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
    process.exit(1);
  }
})();


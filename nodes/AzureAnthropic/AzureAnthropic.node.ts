import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import AnthropicFoundry from '@anthropic-ai/foundry-sdk';

export class AzureAnthropic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Anthropic',
		name: 'azureAnthropic',
		icon: 'fa:comment',
		group: ['transform'],
		version: 1,
		description: 'Interact with Azure Anthropic models via Foundry SDK',
		defaults: {
			name: 'Azure Anthropic',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'azureAnthropicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Deployment Name',
				name: 'deploymentName',
				type: 'string',
				default: '',
				required: true,
				description: 'The name of your Azure Anthropic deployment (e.g., claude-haiku-4-5)',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'string',
				default: '2023-06-01',
				description: 'The API version to use (e.g., 2023-06-01)',
			},
			{
				displayName: 'Messages',
				name: 'messages',
				type: 'json',
				default: '[]',
				required: true,
				description: 'The messages to send to the model. Format: [{"role": "user", "content": "Hello"}]',
			},
			{
				displayName: 'System Message',
				name: 'system',
				type: 'string',
				default: '',
				description: 'System message to prompt the model',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 1024,
				description: 'The maximum number of tokens to generate',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 1.0,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
				},
				description: 'Amount of randomness injected into the response',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('azureAnthropicApi');
				const apiKey = credentials.apiKey as string;
				const baseUrl = credentials.baseUrl as string;
				
				const deploymentName = this.getNodeParameter('deploymentName', i) as string;
				const apiVersion = this.getNodeParameter('apiVersion', i) as string;
				const messages = this.getNodeParameter('messages', i) as any;
				const system = this.getNodeParameter('system', i) as string;
				const maxTokens = this.getNodeParameter('maxTokens', i) as number;
				const temperature = this.getNodeParameter('temperature', i) as number;

				// Initialize Anthropic Foundry client
				// Note: apiVersion is passed as a query parameter via defaultQuery
				const client = new AnthropicFoundry({
					apiKey: apiKey,
					baseURL: baseUrl,
					defaultQuery: { 'api-version': apiVersion },
				});

				const params: any = {
					model: deploymentName,
					messages: typeof messages === 'string' ? JSON.parse(messages) : messages,
					max_tokens: maxTokens,
					temperature: temperature,
				};

				if (system) {
					params.system = system;
				}

				const response = await client.messages.create(params);

				const executionData: INodeExecutionData = {
					json: response as any,
					pairedItem: {
						item: i,
					},
				};

				returnData.push(executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}

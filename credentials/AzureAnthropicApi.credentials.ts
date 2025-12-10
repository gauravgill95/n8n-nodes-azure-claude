import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AzureAnthropicApi implements ICredentialType {
	name = 'azureAnthropicApi';
	displayName = 'Azure Anthropic API';
	documentationUrl = 'https://azure.microsoft.com/en-us/products/ai-services/openai/service';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://YOUR_RESOURCE_NAME.services.ai.azure.com/anthropic/',
			description: 'The endpoint URL for your Azure Anthropic deployment',
		},
	];
}


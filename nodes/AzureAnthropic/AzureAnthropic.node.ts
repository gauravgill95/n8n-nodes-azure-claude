import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
  ISupplyDataFunctions,
  SupplyData,
} from 'n8n-workflow';
import {
  BaseChatModel,
  type BaseChatModelParams,
} from '@langchain/core/language_models/chat_models';
import { type BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { type BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { type ChatResult } from '@langchain/core/outputs';
import { type CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import AnthropicFoundry from '@anthropic-ai/foundry-sdk';

// Define a custom LangChain Chat Model wrapper for Anthropic Foundry
class ChatAnthropicFoundry extends BaseChatModel {
  private client: AnthropicFoundry;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;

  constructor(fields: BaseChatModelParams & {
    apiKey: string;
    baseUrl: string;
    apiVersion: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    super(fields);
    this.modelName = fields.modelName;
    this.temperature = fields.temperature ?? 1.0;
    this.maxTokens = fields.maxTokens ?? 1024;
    
    this.client = new AnthropicFoundry({
      apiKey: fields.apiKey,
      baseURL: fields.baseUrl,
      defaultQuery: { 'api-version': fields.apiVersion },
    });
  }

  _llmType() {
    return 'azure_anthropic_foundry';
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    const formattedMessages = messages.map((msg) => {
      let role: 'user' | 'assistant' | 'system';
      if (msg._getType() === 'human') role = 'user';
      else if (msg._getType() === 'ai') role = 'assistant';
      else if (msg._getType() === 'system') role = 'system';
      else role = 'user'; // Fallback

      // Extract content string (handling simple string content for now)
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      return { role, content };
    });

    const conversationMessages = formattedMessages.filter(m => m.role !== 'system');
    const systemMessage = formattedMessages.find(m => m.role === 'system');

    const params: any = {
      model: this.modelName,
      messages: conversationMessages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };

    if (systemMessage) {
      params.system = systemMessage.content;
    }

    const response = await this.client.messages.create(params);

    const content = response.content.reduce((acc, block) => {
        if (block.type === 'text') return acc + block.text;
        return acc;
    }, '');

    return {
      generations: [
        {
          text: content,
          message: new AIMessage(content),
        },
      ],
    };
  }
}

export class AzureAnthropic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure Anthropic Chat Model',
		name: 'azureAnthropic',
		icon: 'fa:comment',
		group: ['transform'],
		version: 1,
		description: 'Interact with Azure Anthropic models via Foundry SDK',
		defaults: {
			name: 'Azure Anthropic Chat Model',
		},
    // Define inputs/outputs for LangChain Model
		inputs: [],
		outputs: ['ai_languageModel'],
    codex: {
      categories: ['AI'],
      subcategories: {
        AI: ['Language Models', 'Chat Models'],
      },
    },
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

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const credentials = await this.getCredentials('azureAnthropicApi');
    const apiKey = credentials.apiKey as string;
    const baseUrl = credentials.baseUrl as string;
    
    const deploymentName = this.getNodeParameter('deploymentName', itemIndex) as string;
    const apiVersion = this.getNodeParameter('apiVersion', itemIndex) as string;
    const maxTokens = this.getNodeParameter('maxTokens', itemIndex) as number;
    const temperature = this.getNodeParameter('temperature', itemIndex) as number;

    const model = new ChatAnthropicFoundry({
      apiKey,
      baseUrl,
      apiVersion,
      modelName: deploymentName,
      maxTokens,
      temperature,
    });

    return {
      response: model,
    };
  }
}

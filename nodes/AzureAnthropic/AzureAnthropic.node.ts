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
  type BaseChatModelCallOptions,
  type BindToolsInput,
} from '@langchain/core/language_models/chat_models';
import { type BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { type BaseMessage, HumanMessage, AIMessage, SystemMessage, AIMessageChunk } from '@langchain/core/messages';
import { type ChatResult } from '@langchain/core/outputs';
import { type CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { Runnable } from '@langchain/core/runnables';
import { convertToOpenAITool } from '@langchain/core/utils/function_calling';
import AnthropicFoundry from '@anthropic-ai/foundry-sdk';
import { NodeConnectionType } from 'n8n-workflow';

interface ChatAnthropicFoundryCallOptions extends BaseChatModelCallOptions {
  tools?: any[];
}

// Define a custom LangChain Chat Model wrapper for Anthropic Foundry
class ChatAnthropicFoundry extends BaseChatModel<ChatAnthropicFoundryCallOptions> {
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

  override bindTools(
    tools: BindToolsInput[],
    kwargs?: Partial<ChatAnthropicFoundryCallOptions>
  ): Runnable<BaseLanguageModelInput, AIMessageChunk, ChatAnthropicFoundryCallOptions> {
    // @ts-ignore
    return this.bind({
      tools: tools.map((tool) => {
        const openAITool = convertToOpenAITool(tool);
        return {
          name: openAITool.function.name,
          description: openAITool.function.description,
          input_schema: openAITool.function.parameters,
        };
      }),
      ...kwargs,
    } as Partial<ChatAnthropicFoundryCallOptions>) as unknown as Runnable<BaseLanguageModelInput, AIMessageChunk, ChatAnthropicFoundryCallOptions>;
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

      // Extract content string or handle array content
      let content: any = msg.content;
      
      // Handle Tool Calls in Assistant Messages (history)
      if (msg._getType() === 'ai' && (msg as AIMessage).tool_calls?.length) {
         const toolCalls = (msg as AIMessage).tool_calls || [];
         if (toolCalls.length > 0) {
             content = toolCalls.map(tc => ({
                 type: 'tool_use',
                 id: tc.id,
                 name: tc.name,
                 input: tc.args
             }));
             // If there is also text content, it should be prepended as a text block
             if (msg.content && typeof msg.content === 'string') {
                 content.unshift({ type: 'text', text: msg.content });
             }
         }
      }
      
      // Handle Tool Messages (results)
      if (msg._getType() === 'tool') {
          role = 'user'; // Tool results are 'user' messages in Anthropic
          content = [{
              type: 'tool_result',
              tool_use_id: (msg as any).tool_call_id,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          }];
      }

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

    if (options.tools && options.tools.length > 0) {
      params.tools = options.tools;
    }

    const response = await this.client.messages.create(params);

    // Parse Response
    let textContent = '';
    const toolCalls: any[] = [];

    for (const block of response.content) {
        if (block.type === 'text') {
            textContent += block.text;
        } else if (block.type === 'tool_use') {
            toolCalls.push({
                name: block.name,
                args: block.input,
                id: block.id,
                type: 'tool_call'
            });
        }
    }

    const aiMessage = new AIMessage({
        content: textContent,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    return {
      generations: [
        {
          text: textContent,
          message: aiMessage,
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

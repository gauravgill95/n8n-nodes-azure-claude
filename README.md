# n8n-nodes-azure-anthropic

This is an n8n community node that allows you to interact with Azure Anthropic models (e.g., Claude).

## Installation

1. Go to your **n8n** root directory.
2. Run `npm link` in this directory.
3. Run `npm link n8n-nodes-azure-anthropic` in your n8n directory.
4. Restart n8n.

## Credentials

You need to create a new credential of type **Azure Anthropic API**:
- **API Key**: Your Azure Anthropic API Key.
- **Base URL**: The endpoint URL (e.g., `https://YOUR_RESOURCE.services.ai.azure.com/anthropic/`).

## Usage

Add the **Azure Anthropic** node to your workflow.

### Parameters
- **Deployment Name**: The name of your model deployment in Azure (e.g., `claude-haiku-4-5`).
- **Messages**: JSON array of messages or a string parsing to JSON.
  - Example: `[{"role": "user", "content": "Hello world"}]`
- **System Message**: Optional system prompt.
- **Max Tokens**: Maximum tokens to generate.
- **Temperature**: Randomness (0-1).

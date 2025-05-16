<p align="center">
  <img src="https://github.com/user-attachments/assets/a9a7271b-677a-4463-afd0-9d3c58053453" alt="LeapRAGAgent Logo" />
</p>

<h1 align="center">LeapRAG</h1>

<p align="center">
  Dual-powered by RAG & A2A Protocol - Defining the Next Generation of Knowledge Agents
</p>

<p align="center">
  <a href="#quick-start">Self-Hosting</a> ·
  <a href="#key-features">Key Features</a>
</p>

<p align="center">
  <a href="./README.md"><img alt="English" src="https://img.shields.io/badge/English-d9d9d9"></a>
  <a href="./README_CN.md"><img alt="简体中文" src="https://img.shields.io/badge/简体中文-d9d9d9"></a>
</p>

LeapRAG is an open-source platform that combines state-of-the-art Retrieval Augmented Generation (RAG) capabilities with Google's A2A (Agent-to-Agent) protocol. The platform enables users to create knowledge-rich, intelligent agents that deliver highly accurate, context-aware responses backed by your own data sources. These agents are automatically compliant with the A2A protocol, making them discoverable and usable by any A2A-compatible client without additional development effort.

## Demo Video: From Model Setup to A2A Client Testing

This video demonstrates the complete workflow of LeapRAG, including:

- Large language model configuration
- Knowledge base creation
- Knowledge base chat testing
- A2A agent creation
- Testing with Google A2A UI client

**Note:** Sensitive information in the video has been redacted.

https://github.com/user-attachments/assets/69755681-e8a7-4283-ae70-834b209e2721

## Key Features

**1. User-Friendly RAG Platform**:

- Simple and intuitive user interface for quickly building high-quality RAG applications without technical background
- End-to-end visual workflow from document upload to knowledge base creation
- Pre-configured best practices that require no parameter adjustments in most scenarios
- What-you-see-is-what-you-get knowledge base testing with real-time validation
- Built-in tutorials and prompts to assist with each step
- One-click conversion of private knowledge bases into A2A protocol-compliant agents

**2. Advanced RAG Capabilities**:

- High-precision document processing and chunking strategies
- Support for multiple embedding models and vector stores
- Hybrid search with semantic and keyword matching
- Relevance scoring and re-ranking for optimal context selection
- Configurable retrieval parameters to balance precision and recall
- Citation and source tracking for trustworthy responses
- Hallucination detection and mitigation mechanisms

**3. Comprehensive Knowledge Base Management**:

- Support for diverse document formats (PDF, DOCX, TXT, CSV, Markdown, etc.)
- Automatic metadata extraction and indexing
- Interactive chunk visualization with fine-grained inspection capabilities
- Intelligent chunking preview with content relationship mapping
- Custom metadata enrichment for context-aware retrieval optimization
- Real-time chunk quality assessment and refinement tools

**4. Agent Card Generation**:

- Automatically generate A2A-compliant Agent Cards that can be published and discovered by other A2A protocol implementations.

**5. A2A Protocol Support**:

- Full implementation of Google's Agent-to-Agent (A2A) protocol, enabling agent interoperability and collaboration across different frameworks and platforms.

**6. Multi-Model Support**:

- Connect your agents to various open-source and commercial large language models, including DeepSeek, GPT, Mistral, Llama3, Gemini and other OpenAI API-compatible models.

**7. Backend-as-a-Service**:

- All features come with corresponding APIs, making it easy to integrate into your own business logic.

## Quick Start

> Before installing LeapRAG, make sure your machine meets the following minimum system requirements:
>
> - CPU >= 2 Cores
> - RAM >= 4 GiB

</br>

The easiest way to start the LeapRAG server is through [docker compose](docker/docker-compose.yml). Before running the following commands, make sure [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) are installed on your machine:

```bash
# Clone the repository
git clone https://github.com/megrezAI/LeapRAG.git
cd LeapRAG/docker
cp .env.example .env
docker compose up -d
```

After running, you can access the LeapRAG dashboard in your browser at [http://localhost:3100](http://localhost:3100) and start using it after registration and login.

## Creating Your First A2A Agent

1. **Configure Language Models**:

   - Go to system settings and add the language models you want to use
   - Configure API keys and related parameters
   - Select your default model

2. **Add a Knowledge Base**:

   - Name your knowledge base and select the language
   - Upload your documents (PDFs, text files, etc.)

3. **Create and Publish an Agent**:

   - Name your agent and provide a description
   - Associate it with one or more knowledge bases
   - Configure LLM settings and behavior
   - Generate an A2A-compliant Agent Card
   - The system automatically generates an accessible endpoint URL that can be configured in any A2A protocol-compatible client

4. **Use Your Agent**:
   - Use any A2A protocol-compatible client to interact with your agent
   - Configure the client to discover your agent (using the URL generated in the previous step)
   - Your agent will provide knowledge-enhanced answers from your configured sources

## A2A Protocol Integration

LeapRAG fully implements Google's A2A (Agent-to-Agent) protocol, which enables:

- **Standardized Agent Discovery**: Agents publish their capabilities in a standardized format
- **Task-based Communication**: Agents can request and provide services through a standardized JSON-RPC interface
- **Interoperability**: Any A2A-compatible client can discover and use agents created on LeapRAG
- **Multi-turn Conversations**: Support for complex, multi-turn interactions between agents and clients

For more information about the A2A protocol, visit [Google's A2A Protocol Repository](https://github.com/google/a2a).

## Using Google A2A UI Client with DeepSeek V3

We've forked Google's A2A repository and made some simple modifications, primarily replacing the Gemini model with DeepSeek. This modification addresses access limitations to Google services in certain regions, making it easier for more users to test Agent Cards using the client. Users can still use the original client from Google's official repository to discover Agent Cards created by LeapRAG - our modified version simply provides a more convenient testing option.

### Running the A2A Demo Client

1. Clone the modified A2A repository:

   ```bash
   git clone git@github.com:MegrezAI/A2A.git
   ```

2. Navigate to the demo UI directory:

   ```bash
   cd A2A/demo/ui
   ```

3. Set your DeepSeek API key:

   ```bash
   export DEEPSEEK_API_KEY=sk-xxx
   ```

4. Run the application:

   ```bash
   uv run main.py
   ```

5. Access the web interface at http://localhost:12000 and start interacting with your agents

## Public Network Deployment

If you need to deploy LeapRAG to a public network environment so that other A2A clients can discover and call your agents, you'll need to configure the following:

### Nginx Public Network Configuration

1. Navigate to the docker directory and copy the production environment configuration file:

```bash
cd LeapRAG/docker
cp .env.example.production .env
```

2. Modify the following configuration items in the `.env` file:

   - `SERVICE_API_URL_BASE`: Set to your complete domain address

     - For HTTP mode: `http://your-domain.com/api`
     - For HTTPS mode: `https://your-domain.com/api`

   - `NGINX_SERVER_NAME`: Set to your domain name (e.g., `your-domain.com`)

   - **Standard HTTP Configuration**:

     - `EXPOSE_NGINX_PORT`: Recommended to modify to `80` (standard HTTP port)

   - **Enable HTTPS Configuration**:

     - `NGINX_HTTPS_ENABLED=true`
     - `EXPOSE_NGINX_SSL_PORT`: Recommended to modify to `443` (standard HTTPS port)
     - `NGINX_SSL_CERT_FILENAME`: SSL certificate filename (default is `leapai.crt`, modify if using a different name)
     - `NGINX_SSL_CERT_KEY_FILENAME`: SSL certificate key filename (default is `leapai.key`, modify if using a different name)
     - `NGINX_SSL_PROTOCOLS`: SSL protocol settings (default value `TLSv1.1 TLSv1.2 TLSv1.3` usually doesn't need modification)

   - Place your SSL certificate and key files in the `nginx/ssl` directory, ensuring the filenames match the configuration above:
     - Certificate file: `nginx/ssl/leapai.crt` (or the name you specified)
     - Key file: `nginx/ssl/leapai.key` (or the name you specified)

3. Important: If your server firewall is enabled, make sure to open the corresponding ports (80/443)

4. Start all services:

```bash
docker compose up -d
```

After successful configuration, you should be able to access LeapRAG through:

- HTTP mode: `http://your-domain.com`
- HTTPS mode: `https://your-domain.com`

### Configure Agent Public Network Access

After completing the Nginx configuration and confirming that the service is running normally, you need to configure the public network access address for your agent so that other A2A clients can discover and access it:

1. **Agent Local URL**:

   When you create an agent, the system automatically generates a default agent service address based on the `SERVICE_API_URL_BASE` configuration, typically in the format `http://{SERVICE_API_URL_BASE}/rag/{agent_id}`

2. **Customized Agent URL**:

   On the agent configuration page, if needed, you can enter a custom public network access address in the "Customized Agent URL" field.
   This address is typically the agent's public domain name that you configured through Nginx reverse proxy.

3. **Verify Agent Public Network Accessibility**:

   - After saving the configuration, you can directly access your configured public URL through a browser to confirm that you can retrieve the correct Agent Card information

   - Use an A2A client to try connecting to this address and verify that the agent can be properly discovered and called

By correctly configuring the custom agent URL, your agent will be discoverable and usable by any A2A protocol-compatible client in the public network environment.

## Community & Contact

- GitHub Issues: Report bugs and feature suggestions

## Acknowledgements

We would like to acknowledge [RagFlow](https://github.com/infiniflow/ragflow) and their outstanding work on retrieval-augmented generation for inspiring parts of the implementation in LeapRAG.

## License

This project is licensed under the [Apache 2.0 License](LICENSE).

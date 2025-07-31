import WebSocket from 'ws';
import EventEmitter from 'events';

class RealtimeTranslator extends EventEmitter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    this.ws = null;
    this.sessionId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async start() {
    try {
      await this.connect();
      await this.initializeSession();
    } catch (error) {
      console.error('Failed to start translator:', error);
      throw error;
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.ws.on('open', () => {
        console.log('Connected to OpenAI Realtime API');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.handleDisconnect();
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  async initializeSession() {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text'],
        instructions: 'You are a real-time translator. Listen to the audio input in any language and translate it to English. Always respond with the English translation of what you hear. If the audio is in Japanese, translate it to English. If it\'s already in English, provide a transcription.',
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        tool_choice: 'none',
        temperature: 0.7,
        max_response_output_tokens: 4096
      }
    };

    this.sendMessage(sessionConfig);
  }

  sendMessage(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'session.created':
          this.sessionId = message.session.id;
          console.log('Session created:', this.sessionId);
          this.emit('session.created', message.session);
          break;
          
        case 'session.updated':
          console.log('Session updated');
          break;
          
        case 'conversation.item.created':
          if (message.item.role === 'assistant' && message.item.content) {
            this.handleTranslation(message.item);
          }
          break;
          
        case 'response.audio.delta':
          this.emit('audio.output', message.delta);
          break;
          
        case 'response.text.delta':
          if (message.delta) {
            this.emit('text.output', message.delta);
          }
          break;
          
        case 'response.text.done':
          if (message.text) {
            console.log('\nFull text:', message.text);
            this.emit('translation', message.text);
          }
          break;
          
        case 'response.audio_transcript.delta':
          if (message.delta) {
            this.emit('text.output', message.delta);
          }
          break;
          
        case 'response.audio_transcript.done':
          if (message.transcript) {
            console.log('\nTranscript:', message.transcript);
          }
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          if (message.transcript) {
            console.log('\nInput transcription:', message.transcript);
          }
          break;
          
        case 'response.done':
          if (message.response && message.response.output) {
            for (const output of message.response.output) {
              if (output.type === 'message' && output.content) {
                for (const content of output.content) {
                  if (content.type === 'text') {
                    console.log('\nTranslation:', content.text);
                    this.emit('translation', content.text);
                  }
                }
              }
            }
          }
          this.emit('response.complete', message.response);
          break;
          
        case 'error':
          console.error('API Error:', message.error);
          this.emit('error', message.error);
          break;
          
        default:
          if (process.env.DEBUG) {
            console.log('Unhandled message type:', message.type);
            if (message.type.includes('response')) {
              console.log('Response message:', JSON.stringify(message, null, 2));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  handleTranslation(item) {
    if (item.content && item.content[0]) {
      const content = item.content[0];
      if (content.type === 'text' && content.text) {
        console.log('\nTranslation:', content.text);
        this.emit('translation', content.text);
      }
    }
  }

  sendAudio(audioBuffer) {
    if (!this.isConnected) {
      console.error('Not connected to API');
      return;
    }

    const base64Audio = audioBuffer.toString('base64');
    const message = {
      type: 'input_audio_buffer.append',
      audio: base64Audio
    };
    
    this.sendMessage(message);
  }

  commitAudioBuffer() {
    if (!this.isConnected) return;
    
    const message = {
      type: 'input_audio_buffer.commit'
    };
    
    this.sendMessage(message);
  }

  createResponse() {
    if (!this.isConnected) return;
    
    const message = {
      type: 'response.create',
      response: {
        modalities: ['text']
      }
    };
    
    this.sendMessage(message);
  }

  async handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
      
      try {
        await this.connect();
        await this.initializeSession();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('disconnect');
    }
  }

  async stop() {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }
}

export default RealtimeTranslator;
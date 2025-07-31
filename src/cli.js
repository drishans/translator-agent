import dotenv from 'dotenv';
import RealtimeTranslator from './RealtimeTranslator.js';
import AudioCapture from './AudioCapture.js';
import readline from 'readline';

dotenv.config();

class TranslatorCLI {
  constructor() {
    this.translator = null;
    this.audioCapture = null;
    this.isTranslating = false;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async init() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY not found in .env file');
      process.exit(1);
    }

    this.translator = new RealtimeTranslator(apiKey);
    this.audioCapture = new AudioCapture();
    
    this.setupEventHandlers();
    this.displayWelcome();
    this.promptUser();
  }

  displayWelcome() {
    console.clear();
    console.log('====================================');
    console.log('  Realtime Audio Translator');
    console.log('====================================');
    console.log('\nCommands:');
    console.log('  start  - Start translation');
    console.log('  stop   - Stop translation');
    console.log('  clear  - Clear console');
    console.log('  help   - Show commands');
    console.log('  exit   - Quit application\n');
  }

  setupEventHandlers() {
    this.translator.on('session.created', () => {
      console.log('✓ Connected to OpenAI Realtime API');
      console.log('✓ Session ready');
      console.log('\nListening for audio input...\n');
      this.startAudioCapture();
    });

    this.translator.on('translation', (text) => {
      console.log(`\n[Translation] ${text}\n`);
    });

    this.translator.on('error', (error) => {
      console.error(`\n[Error] ${error.message || error}\n`);
    });

    this.translator.on('disconnect', () => {
      console.log('\n[Disconnected] Connection lost\n');
      this.stopTranslation();
    });
  }

  startAudioCapture() {
    let audioChunkBuffer = Buffer.alloc(0);
    const chunkSize = 8192;

    this.audioCapture.on('audio', (audioData) => {
      audioChunkBuffer = Buffer.concat([audioChunkBuffer, audioData]);
      
      if (audioChunkBuffer.length >= chunkSize) {
        this.translator.sendAudio(audioChunkBuffer.slice(0, chunkSize));
        audioChunkBuffer = audioChunkBuffer.slice(chunkSize);
      }
    });

    this.audioCapture.on('error', (error) => {
      console.error(`\n[Audio Error] ${error.message}\n`);
    });

    this.audioCapture.start();
  }

  async startTranslation() {
    if (this.isTranslating) {
      console.log('Translation is already active\n');
      return;
    }

    try {
      console.log('Starting translator...');
      this.isTranslating = true;
      await this.translator.start();
    } catch (error) {
      console.error(`Failed to start: ${error.message}\n`);
      this.isTranslating = false;
    }
  }

  async stopTranslation() {
    if (!this.isTranslating) {
      console.log('Translation is not active\n');
      return;
    }

    console.log('Stopping translator...');
    this.audioCapture.stop();
    await this.translator.stop();
    this.isTranslating = false;
    console.log('✓ Stopped\n');
  }

  promptUser() {
    this.rl.question('> ', async (input) => {
      const command = input.trim().toLowerCase();

      switch (command) {
        case 'start':
          await this.startTranslation();
          break;
        case 'stop':
          await this.stopTranslation();
          break;
        case 'clear':
          console.clear();
          this.displayWelcome();
          break;
        case 'help':
          this.displayWelcome();
          break;
        case 'exit':
        case 'quit':
          await this.cleanup();
          process.exit(0);
          break;
        default:
          if (command) {
            console.log(`Unknown command: ${command}\n`);
          }
      }

      this.promptUser();
    });
  }

  async cleanup() {
    console.log('\nShutting down...');
    if (this.isTranslating) {
      await this.stopTranslation();
    }
    this.rl.close();
  }
}

const cli = new TranslatorCLI();
cli.init().catch(console.error);

process.on('SIGINT', async () => {
  await cli.cleanup();
  process.exit(0);
});
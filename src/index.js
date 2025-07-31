import dotenv from 'dotenv';
import RealtimeTranslator from './RealtimeTranslator.js';
import AudioCapture from './AudioCapture.js';
import AudioPlayer from './AudioPlayer.js';

dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  const translator = new RealtimeTranslator(apiKey);
  const audioCapture = new AudioCapture();
  const audioPlayer = new AudioPlayer();
  
  console.log('Starting Realtime Audio Translator...');
  console.log('Speak into your microphone to translate to English');
  console.log('Press Ctrl+C to stop\n');
  
  try {
    await translator.start();
    
    translator.on('session.created', () => {
      console.log('Session ready, starting audio capture...\n');
      audioCapture.start();
    });
    
    let audioChunkBuffer = Buffer.alloc(0);
    const chunkSize = 8192;
    
    audioCapture.on('audio', (audioData) => {
      audioChunkBuffer = Buffer.concat([audioChunkBuffer, audioData]);
      
      if (audioChunkBuffer.length >= chunkSize) {
        translator.sendAudio(audioChunkBuffer.slice(0, chunkSize));
        audioChunkBuffer = audioChunkBuffer.slice(chunkSize);
      }
    });
    
    translator.on('translation', (text) => {
      console.log('Translation:', text);
    });
    
    translator.on('audio.output', (audioData) => {
      audioPlayer.play(audioData);
    });
    
    translator.on('error', (error) => {
      console.error('Translation error:', error);
    });
    
    translator.on('disconnect', () => {
      console.log('Disconnected from API');
      audioCapture.stop();
      audioPlayer.stop();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Failed to start translator:', error);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    console.log('\nStopping translator...');
    audioCapture.stop();
    audioPlayer.stop();
    await translator.stop();
    process.exit(0);
  });
}

main().catch(console.error);
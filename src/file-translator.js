import dotenv from 'dotenv';
import RealtimeTranslator from './RealtimeTranslator.js';
import AudioFileReader from './AudioFileReader.js';
import path from 'path';

dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const audioFile = process.argv[2];
  
  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  if (!audioFile) {
    console.error('Usage: npm run file <audio-file-path>');
    console.error('Example: npm run file audio/sample.mp3');
    process.exit(1);
  }

  const translator = new RealtimeTranslator(apiKey);
  const audioReader = new AudioFileReader();
  
  console.log('Starting File-based Audio Translator...');
  console.log(`Audio file: ${audioFile}`);
  console.log('-----------------------------------\n');
  
  try {
    await translator.start();
    
    translator.on('session.created', async () => {
      console.log('Session ready, processing audio file...\n');
      
      let audioChunkBuffer = Buffer.alloc(0);
      const chunkSize = 8192;
      let totalChunks = 0;
      
      audioReader.on('audio', (audioData) => {
        audioChunkBuffer = Buffer.concat([audioChunkBuffer, audioData]);
        
        while (audioChunkBuffer.length >= chunkSize) {
          translator.sendAudio(audioChunkBuffer.slice(0, chunkSize));
          audioChunkBuffer = audioChunkBuffer.slice(chunkSize);
          totalChunks++;
          
          if (totalChunks % 10 === 0) {
            process.stdout.write('.');
          }
        }
      });
      
      audioReader.on('end', () => {
        // Send any remaining audio
        if (audioChunkBuffer.length > 0) {
          translator.sendAudio(audioChunkBuffer);
        }
        
        // Commit the audio buffer to trigger processing
        translator.commitAudioBuffer();
        
        // Trigger a response
        setTimeout(() => {
          translator.createResponse();
        }, 1000);
        
        console.log('\n\nAudio file processed, waiting for translation...\n');
      });
      
      audioReader.on('error', (error) => {
        console.error('Error reading audio file:', error);
        process.exit(1);
      });
      
      // Start reading the audio file
      await audioReader.readFile(audioFile);
    });
    
    translator.on('translation', (text) => {
      console.log('\n=== TRANSLATION ===');
      console.log(text);
      console.log('==================\n');
    });
    
    translator.on('text.output', (text) => {
      process.stdout.write(text);
    });
    
    translator.on('response.complete', async () => {
      console.log('\n\nTranslation complete!');
      await translator.stop();
      process.exit(0);
    });
    
    translator.on('error', (error) => {
      console.error('Translation error:', error);
    });
    
    translator.on('disconnect', () => {
      console.log('Disconnected from API');
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Failed to start translator:', error);
    process.exit(1);
  }

  // Handle timeout (in case API doesn't respond)
  setTimeout(() => {
    console.log('\nTimeout reached, exiting...');
    translator.stop();
    process.exit(0);
  }, 60000); // 60 second timeout

  process.on('SIGINT', async () => {
    console.log('\nStopping translator...');
    audioReader.stop();
    await translator.stop();
    process.exit(0);
  });
}

main().catch(console.error);
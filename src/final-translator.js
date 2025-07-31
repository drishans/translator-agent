import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

class AudioTranslator {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async translateFile(audioFilePath) {
    console.log(`Translating: ${path.basename(audioFilePath)}\n`);
    
    const form = new FormData();
    form.append('file', fs.createReadStream(audioFilePath));
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    form.append('task', 'translate'); // Translates to English
    
    try {
      console.log('Sending to OpenAI Whisper API...');
      const response = await fetch('https://api.openai.com/v1/audio/translations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...form.getHeaders()
        },
        body: form
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error?.message || response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.text) {
        return {
          success: true,
          translation: result.text,
          file: path.basename(audioFilePath)
        };
      } else {
        throw new Error('No translation received');
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        file: path.basename(audioFilePath)
      };
    }
  }

  async translateWithTranscription(audioFilePath) {
    console.log(`Processing: ${path.basename(audioFilePath)}\n`);
    
    // First, get transcription in original language
    const transcriptForm = new FormData();
    transcriptForm.append('file', fs.createReadStream(audioFilePath));
    transcriptForm.append('model', 'whisper-1');
    transcriptForm.append('response_format', 'json');
    
    // Then get translation
    const translateForm = new FormData();
    translateForm.append('file', fs.createReadStream(audioFilePath));
    translateForm.append('model', 'whisper-1');
    translateForm.append('response_format', 'json');
    translateForm.append('task', 'translate');
    
    try {
      console.log('Getting transcription...');
      const [transcriptResponse, translateResponse] = await Promise.all([
        fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...transcriptForm.getHeaders()
          },
          body: transcriptForm
        }),
        fetch('https://api.openai.com/v1/audio/translations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            ...translateForm.getHeaders()
          },
          body: translateForm
        })
      ]);
      
      const transcriptResult = await transcriptResponse.json();
      const translateResult = await translateResponse.json();
      
      return {
        success: true,
        transcription: transcriptResult.text,
        translation: translateResult.text,
        file: path.basename(audioFilePath)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        file: path.basename(audioFilePath)
      };
    }
  }
}

// CLI usage
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const audioFile = process.argv[2];
  const showOriginal = process.argv.includes('--with-original');
  
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY not found in .env file');
    process.exit(1);
  }
  
  if (!audioFile) {
    console.error('Usage: node final-translator.js <audio-file> [--with-original]');
    console.error('Example: node final-translator.js audio.mp3');
    console.error('         node final-translator.js audio.mp3 --with-original');
    process.exit(1);
  }
  
  if (!fs.existsSync(audioFile)) {
    console.error(`Error: File not found: ${audioFile}`);
    process.exit(1);
  }
  
  const translator = new AudioTranslator(apiKey);
  
  try {
    let result;
    
    if (showOriginal) {
      result = await translator.translateWithTranscription(audioFile);
      
      if (result.success) {
        console.log('=== ORIGINAL ===');
        console.log(result.transcription);
        console.log('\n=== TRANSLATION ===');
        console.log(result.translation);
      }
    } else {
      result = await translator.translateFile(audioFile);
      
      if (result.success) {
        console.log('=== TRANSLATION ===');
        console.log(result.translation);
      }
    }
    
    if (!result.success) {
      console.error('\nError:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
export default AudioTranslator;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
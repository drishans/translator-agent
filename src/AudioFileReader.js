import fs from 'fs';
import { spawn } from 'child_process';
import EventEmitter from 'events';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

class AudioFileReader extends EventEmitter {
  constructor() {
    super();
    this.isReading = false;
    this.ffmpeg = null;
    this.sampleRate = 24000;
    this.channels = 1;
    this.bitDepth = 16;
  }

  async readFile(filePath) {
    if (this.isReading) {
      throw new Error('Already reading a file');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    this.isReading = true;
    console.log(`Reading audio file: ${filePath}`);

    try {
      // Use ffmpeg to convert any audio format to PCM16 @ 24kHz mono
      this.ffmpeg = spawn('ffmpeg', [
        '-i', filePath,
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        '-ar', this.sampleRate.toString(),
        '-ac', this.channels.toString(),
        '-'
      ], {
        stdio: ['ignore', 'pipe', 'ignore']
      });

      const chunkSize = 4096;
      let buffer = Buffer.alloc(0);

      const transformStream = new Transform({
        transform(chunk, encoding, callback) {
          buffer = Buffer.concat([buffer, chunk]);
          
          while (buffer.length >= chunkSize) {
            const frame = buffer.slice(0, chunkSize);
            buffer = buffer.slice(chunkSize);
            this.push(frame);
          }
          
          callback();
        },
        flush(callback) {
          if (buffer.length > 0) {
            this.push(buffer);
          }
          callback();
        }
      });

      transformStream.on('data', (chunk) => {
        this.emit('audio', chunk);
      });

      await pipeline(this.ffmpeg.stdout, transformStream);
      
      console.log('Finished reading audio file');
      this.emit('end');
      
    } catch (error) {
      console.error('Error reading audio file:', error);
      this.emit('error', error);
    } finally {
      this.isReading = false;
      this.ffmpeg = null;
    }
  }

  stop() {
    if (this.ffmpeg && this.isReading) {
      this.ffmpeg.kill();
      this.ffmpeg = null;
      this.isReading = false;
      console.log('Audio file reading stopped');
    }
  }
}

export default AudioFileReader;
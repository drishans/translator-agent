import Speaker from 'speaker';
import EventEmitter from 'events';

class AudioPlayer extends EventEmitter {
  constructor() {
    super();
    this.speaker = null;
    this.sampleRate = 24000;
    this.channels = 1;
    this.bitDepth = 16;
  }

  initialize() {
    try {
      this.speaker = new Speaker({
        channels: this.channels,
        bitDepth: this.bitDepth,
        sampleRate: this.sampleRate
      });

      this.speaker.on('error', (error) => {
        console.error('Speaker error:', error);
        this.emit('error', error);
      });

      this.speaker.on('close', () => {
        this.emit('close');
      });

      return this.speaker;
    } catch (error) {
      console.error('Failed to initialize speaker:', error);
      throw error;
    }
  }

  play(audioData) {
    if (!this.speaker) {
      this.initialize();
    }

    if (typeof audioData === 'string') {
      const buffer = Buffer.from(audioData, 'base64');
      this.speaker.write(buffer);
    } else if (Buffer.isBuffer(audioData)) {
      this.speaker.write(audioData);
    }
  }

  stop() {
    if (this.speaker) {
      this.speaker.end();
      this.speaker = null;
    }
  }
}

export default AudioPlayer;
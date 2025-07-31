import record from 'node-record-lpcm16';
import EventEmitter from 'events';

class AudioCapture extends EventEmitter {
  constructor() {
    super();
    this.recording = null;
    this.isRecording = false;
    this.bufferSize = 4096;
    this.sampleRate = 24000;
  }

  start() {
    if (this.isRecording) {
      console.log('Already recording');
      return;
    }

    try {
      this.recording = record.record({
        sampleRate: this.sampleRate,
        channels: 1,
        audioType: 'raw',
        recorder: process.platform === 'darwin' ? 'sox' : 'rec',
        silence: '0.0',
        threshold: 0.5,
        device: null,
        endOnSilence: false
      });

      this.isRecording = true;
      console.log('Audio capture started');

      let audioBuffer = Buffer.alloc(0);

      this.recording.stream()
        .on('data', (chunk) => {
          audioBuffer = Buffer.concat([audioBuffer, chunk]);
          
          while (audioBuffer.length >= this.bufferSize) {
            const frame = audioBuffer.slice(0, this.bufferSize);
            audioBuffer = audioBuffer.slice(this.bufferSize);
            this.emit('audio', frame);
          }
        })
        .on('error', (error) => {
          console.error('Recording error:', error);
          this.emit('error', error);
          this.stop();
        })
        .on('end', () => {
          console.log('Recording ended');
          this.isRecording = false;
        });

    } catch (error) {
      console.error('Failed to start recording:', error);
      console.error('Make sure you have sox (macOS) or rec (Linux) installed');
      throw error;
    }
  }

  stop() {
    if (this.recording && this.isRecording) {
      this.recording.stop();
      this.recording = null;
      this.isRecording = false;
      console.log('Audio capture stopped');
    }
  }
}

export default AudioCapture;
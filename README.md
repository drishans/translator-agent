# Realtime Audio Translator

A real-time audio translation agent using OpenAI's Realtime API. This application captures audio from your microphone, sends it to OpenAI for translation, and provides English translations in real-time.

## Features

- Real-time audio capture from microphone
- WebSocket connection to OpenAI Realtime API
- Automatic translation to English
- Audio playback of translations (optional)
- Automatic reconnection on connection loss
- Interactive CLI interface
- Clean error handling

## Prerequisites

- Node.js 18+ 
- OpenAI API key with access to the Realtime API
- For file mode: `ffmpeg` 
  - **macOS**: `brew install ffmpeg`
  - **Linux**: `sudo apt-get install ffmpeg`
- For microphone mode:
  - **macOS**: `sox` (install with `brew install sox`)
  - **Linux**: `rec` (usually comes with `sox` package)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd translator_agent
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` and add your api key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Audio File Translation
```bash
npm run translate <audio-file>
```
Example:
```bash
npm run translate test-audio/sample.mp3
```

To see both original transcription and translation:
```bash
npm run translate test-audio/sample.mp3 -- --with-original
```

This uses OpenAI's Whisper API for accurate audio transcription and translation.

### Real-time Modes (Experimental)

#### Basic Mode (Microphone)
```bash
npm start
```
This starts the translator immediately and begins listening for audio input.

#### File Mode with Realtime API
```bash
npm run file <path-to-audio-file>
```
Note: The Realtime API is designed for conversational interactions, not batch translation.

#### Interactive CLI Mode
```bash
npm run cli
```
This provides an interactive interface with commands:
- `start` - Start translation
- `stop` - Stop translation  
- `clear` - Clear console
- `help` - Show commands
- `exit` - Quit application

## Architecture

### Core Components

1. **AudioTranslator** (`src/final-translator.js`)
   - Uses OpenAI Whisper API for translation
   - Supports both transcription and translation
   - Handles various audio formats (MP3, WAV, M4A, etc.)
   - Simple and reliable for file-based translation

2. **RealtimeTranslator** (`src/RealtimeTranslator.js`)
   - Manages WebSocket connection to OpenAI Realtime API
   - Handles session configuration and message routing
   - Implements automatic reconnection logic
   - Best suited for conversational AI applications

3. **AudioCapture** (`src/AudioCapture.js`)
   - Captures audio from system microphone
   - Streams PCM16 audio data at 24kHz
   - Handles platform-specific recording tools

4. **CLI Interface** (`src/cli.js`)
   - Provides interactive command-line interface
   - Manages application state and user commands

### Data Flow

1. Audio is captured from microphone in PCM16 format
2. Audio chunks are buffered and sent to OpenAI via WebSocket
3. OpenAI processes audio and returns translations
4. Translations are displayed in the console
5. Optional audio responses are played back

### Error Handling

- Automatic reconnection on WebSocket disconnection (up to 5 attempts)
- Graceful error messages for missing dependencies
- Clean shutdown on SIGINT (Ctrl+C)

## API Configuration

The application uses these OpenAI Realtime API settings:
- Model: `gpt-4o-realtime-preview-2024-12-17`
- Input format: PCM16 @ 24kHz
- Voice Activity Detection (VAD) enabled
- Temperature: 0.3 for consistent translations

## Troubleshooting

### "Cannot find module 'node-record-lpcm16'"
Run `npm install` to install all dependencies.

### "Recording error" on macOS
Install sox: `brew install sox`

### "Recording error" on Linux
Install sox: `sudo apt-get install sox`

### Connection issues
- Verify your OpenAI API key is correct
- Check that your API key has access to the Realtime API
- Ensure stable internet connection

## Code Quality

This implementation demonstrates:
- Clean, modular architecture with separation of concerns
- Event-driven design using EventEmitter
- Proper error handling and recovery
- ES6 modules and modern JavaScript practices
- Clear documentation and comments where necessary

## Future Enhancements

Potential improvements for production use:
- Add support for multiple target languages
- Implement user authentication
- Add recording quality settings
- Create web-based UI
- Add translation history/logging
- Implement rate limiting
- Add unit and integration tests
- Container deployment support

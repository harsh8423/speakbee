# 🐝 speakBee - AI Voice Intelligence Platform

A sophisticated AI-powered voice intelligence platform featuring speaker diarization, voice recognition, and real-time conversation capabilities with a premium glass morphism UI.

## ✨ Features

### 🎤 Voice Assistant
- **Real-time Voice Chat**: Interactive AI conversations with speech synthesis
- **Push-to-Talk Interface**: Intuitive voice recording with visual feedback
- **Speaker Recognition**: Automatic identification of enrolled speakers
- **Live Transcription**: Real-time speech-to-text conversion

### 🎵 Audio Analysis
- **Speaker Diarization**: Automatic speaker separation and identification
- **Multi-format Support**: WAV file processing with quality optimization
- **Detailed Results**: Timestamped segments with speaker information
- **Batch Processing**: Handle multiple audio files efficiently

### 👥 Speaker Management
- **Voice Enrollment**: Register speakers with voice samples
- **Profile Management**: Add, view, and delete speaker profiles
- **Recognition Training**: Improve accuracy with multiple samples
- **Bulk Operations**: Manage multiple speakers efficiently

### 📊 Results & Analytics
- **Analysis History**: View and manage past diarization results
- **Detailed Viewer**: Examine segments with timestamps and confidence scores
- **Export Options**: Save results in various formats
- **Statistics Dashboard**: Track usage and performance metrics

## 🎨 Premium UI Design

### Glass Morphism Interface
- **Backdrop Blur Effects**: Modern glass-like components
- **Gradient Backgrounds**: Sophisticated color transitions
- **Floating Animations**: Smooth, engaging interactions
- **Premium Shadows**: Multi-layered depth effects

### Design System
- **Color Scheme**: Professional black/white/grey palette
- **Typography**: Inter font family with proper hierarchy
- **Responsive Layout**: Mobile-first design approach
- **Accessibility**: WCAG compliant color contrasts

### Interactive Elements
- **Hover Effects**: Smooth transitions and transformations
- **Status Indicators**: Real-time connection and system status
- **Loading States**: Elegant shimmer and pulse animations
- **Visual Feedback**: Clear user interaction responses

## 🏗️ Architecture

### Frontend (Next.js 14)
```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── page.js            # Dashboard
│   │   ├── voice-assistant/   # Voice chat interface
│   │   ├── audio-analysis/    # File processing
│   │   ├── speaker-management/# Speaker enrollment
│   │   └── results/           # Analysis viewer
│   ├── components/            # Reusable UI components
│   ├── contexts/             # React contexts
│   └── lib/                  # Utilities and API
```

### Backend (FastAPI + Python)
```
backend/
├── app.py                    # Main FastAPI application
├── requirements.txt          # Python dependencies
└── models/                   # AI models and processing
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MoAftaab/speakbee.git
   cd speakbee
   ```

2. **Backend Setup**
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Start the backend server
   python app.py
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Install dependencies
   npm install
   
   # Create environment file
   cp .env.example .env.local
   
   # Start development server
   npm run dev
   ```

4. **Environment Configuration**
   ```env
   # frontend/.env.local
   NEXT_PUBLIC_BACKEND_WS_URL=ws://127.0.0.1:8000/ws/stream
   NEXT_PUBLIC_BACKEND_HTTP_URL=http://127.0.0.1:8000
   ```

### Usage

1. **Start the Application**
   - Backend: `python app.py` (runs on port 8000)
   - Frontend: `npm run dev` (runs on port 3000)

2. **Connect to Backend**
   - Open the dashboard and click "Connect to Backend"
   - Status indicators will show connection state

3. **Enroll Speakers**
   - Navigate to Speaker Management
   - Record voice samples or upload WAV files
   - Speakers will be available for recognition

4. **Use Voice Assistant**
   - Go to Voice Assistant page
   - Hold the microphone button and speak
   - AI will respond with voice synthesis

5. **Analyze Audio**
   - Visit Audio Analysis page
   - Upload multi-speaker audio files
   - View diarization results with speaker identification

## 🔧 Technical Details

### Connection Management
- **WebSocket**: Real-time bidirectional communication
- **Context API**: Global connection state management
- **Auto-reconnection**: Handles connection drops gracefully
- **Status Monitoring**: Live system health indicators

### Audio Processing
- **VAD (Voice Activity Detection)**: Silence trimming
- **Format Conversion**: Automatic audio optimization
- **Real-time Processing**: Stream-based audio handling
- **Quality Enhancement**: Noise reduction and normalization

### State Management
- **React Context**: Global state for connection and data
- **Local Storage**: Persistent result caching
- **Real-time Updates**: Live data synchronization
- **Error Handling**: Graceful failure recovery

## 📱 Responsive Design

### Desktop (1200px+)
- **Multi-column Layout**: Efficient space utilization
- **Sidebar Navigation**: Easy access to all features
- **Large Interactive Elements**: Comfortable interaction
- **Detailed Information Display**: Full feature visibility

### Tablet (768px - 1199px)
- **Adaptive Grid**: Flexible column arrangements
- **Touch-friendly Controls**: Optimized button sizes
- **Collapsible Sections**: Space-efficient design
- **Gesture Support**: Swipe and touch interactions

### Mobile (< 768px)
- **Single Column Layout**: Streamlined interface
- **Bottom Navigation**: Thumb-friendly access
- **Simplified Controls**: Essential features only
- **Optimized Performance**: Reduced animations

## 🎯 Performance Optimizations

### Frontend
- **CSS-only Animations**: Hardware-accelerated transitions
- **Component Lazy Loading**: Reduced initial bundle size
- **Image Optimization**: Next.js automatic optimization
- **Code Splitting**: Route-based bundle splitting

### Backend
- **Async Processing**: Non-blocking audio operations
- **Memory Management**: Efficient buffer handling
- **Caching Strategy**: Reduced computation overhead
- **Connection Pooling**: Optimized WebSocket handling

## 🔒 Security Features

### Data Protection
- **Environment Variables**: Secure configuration management
- **Input Validation**: Sanitized user inputs
- **File Type Checking**: Safe file upload handling
- **CORS Configuration**: Controlled cross-origin requests

### Privacy
- **Local Processing**: Audio data stays on device when possible
- **Temporary Storage**: Automatic cleanup of processed files
- **No Persistent Audio**: Voice data not permanently stored
- **User Consent**: Clear data usage policies

## 🤝 Contributing

### Development Workflow
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the coding standards
4. **Test thoroughly**: Ensure all features work
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**: Describe your changes

### Code Standards
- **ESLint**: JavaScript/React linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety (future enhancement)
- **Component Documentation**: Clear prop definitions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team**: For the amazing React framework
- **FastAPI**: For the high-performance Python backend
- **Vercel**: For deployment and hosting solutions
- **Open Source Community**: For the incredible tools and libraries

## 📞 Support

For support, email support@speakbee.ai or join our Discord community.

---

**Built with ❤️ by the speakBee Team**

*Transforming voice interactions with AI-powered intelligence*
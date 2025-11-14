import { Heart, MessageCircle, Play, Music, User, Twitter, Linkedin, Facebook, Instagram } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-36 bg-indigo-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-teal-400/20 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold">verseUp!</div>
          <ul className="hidden md:flex space-x-8 text-sm font-medium">
            <li><a href="#home" className="hover:text-cyan-300 transition-colors">Home</a></li>
            <li><a href="#features" className="hover:text-cyan-300 transition-colors">Features</a></li>
            <li><a href="#about" className="hover:text-cyan-300 transition-colors">About</a></li>
            <li><a href="#contact" className="hover:text-cyan-300 transition-colors">Contact</a></li>
          </ul>
          <button className="bg-cyan-400 hover:bg-cyan-500 text-indigo-900 px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105">
            Sign Up
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Learn in the
              <span className="block text-cyan-300">Metaverse</span>
            </h1>
            <p className="text-lg text-indigo-100 leading-relaxed">
              메타버스 공간에서 교수자와 학생들이 함께하는 새로운 교육 경험을 시작하세요
            </p>
            <div className="flex gap-4">
              <button className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-indigo-900 px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl">
                Start Learning
              </button>
              <button className="glass-effect hover:bg-white/20 px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-2">
                <Play size={20} />
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-indigo-200">
              가상 교실에서 실시간으로 수업을 진행하고, 화면을 공유하며, 함께 학습하세요
            </p>
          </div>

          {/* Right Content - 3D Illustration Area */}
          <div className="relative">
            {/* Main Card - 모든 내부 요소가 함께 움직임 */}
            <div className="relative z-10 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl animate-card-float">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 mb-6 bg-indigo-950/50 px-4 py-3 rounded-t-xl -mx-8 -mt-8">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                  <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                  <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                </div>
              </div>

              {/* User Profile Section */}
              <div className="flex items-center gap-4 mb-6 bg-indigo-800/30 p-4 rounded-xl">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-full flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/30 rounded-full w-3/4"></div>
                  <div className="h-2 bg-white/20 rounded-full w-1/2"></div>
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-white/10 rounded-xl p-6 mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-purple-400/20"></div>
                <div className="relative w-16 h-16 mx-auto bg-cyan-400 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Stats Area */}
              <div className="bg-indigo-800/30 rounded-xl p-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-cyan-400/30 rounded-full flex items-center justify-center">
                      <Play size={16} className="text-cyan-300" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-16 bg-cyan-400/50 rounded"></div>
                    <div className="w-8 h-24 bg-cyan-400/70 rounded"></div>
                    <div className="w-8 h-20 bg-cyan-400/60 rounded"></div>
                    <div className="w-8 h-12 bg-cyan-400/40 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements - 각각 독립적으로 움직임 */}
            <div className="absolute -top-6 -right-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 shadow-xl animate-drift">
              <Heart className="text-pink-400" size={32} fill="currentColor" />
            </div>

            <div className="absolute top-20 -left-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 animate-bounce-gentle" style={{ animationDelay: '0.5s' }}>
              <MessageCircle className="text-cyan-300" size={20} />
              <span className="font-bold text-lg">25</span>
            </div>

            <div className="absolute -bottom-6 left-1/4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 shadow-xl animate-drift-reverse" style={{ animationDelay: '1s' }}>
              <User className="text-cyan-400" size={28} />
            </div>

            <div className="absolute bottom-12 -right-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-3 shadow-xl animate-sway">
              <Music className="text-purple-400" size={24} />
            </div>

            <div className="absolute top-1/2 -right-12 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg border border-white/30 rounded-3xl p-6 shadow-2xl animate-float-slower" style={{ animationDelay: '1.5s' }}>
              <Heart className="text-white" size={40} fill="currentColor" />
            </div>

            {/* Additional small decorative circles - 각각 다른 애니메이션 */}
            <div className="absolute top-10 left-20 w-4 h-4 bg-cyan-300 rounded-full animate-bounce-gentle"></div>
            <div className="absolute bottom-24 right-12 w-3 h-3 bg-purple-300 rounded-full animate-drift" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/3 left-4 w-2 h-2 bg-teal-300 rounded-full animate-float-slow" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-8">
        <div className="flex justify-end items-center gap-6">
          <a href="#" className="text-white/60 hover:text-white transition-colors">
            <Twitter size={20} />
          </a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">
            <Linkedin size={20} />
          </a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">
            <Facebook size={20} />
          </a>
          <a href="#" className="text-white/60 hover:text-white transition-colors">
            <Instagram size={20} />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;

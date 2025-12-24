-- =====================================================
-- LIVE SESSIONS SCHEMA
-- =====================================================
-- Purpose: Creates tables for real-time online lecture sessions
-- Contents:
--   1. Live Sessions table (scheduled/live/ended sessions)
--   2. Chat Messages table (session chat history)
--   3. Indexes and triggers
-- =====================================================

-- =====================================================
-- 1. LIVE SESSIONS TABLE
-- =====================================================
-- Stores scheduled and live lecture session information

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON public.live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_at ON public.live_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);

-- Comments
COMMENT ON TABLE public.live_sessions IS '실시간 강의 세션 정보';
COMMENT ON COLUMN public.live_sessions.session_url IS 'WebRTC 세션 URL 또는 스트림 키';
COMMENT ON COLUMN public.live_sessions.duration_minutes IS '세션 예상 진행 시간 (분)';
COMMENT ON COLUMN public.live_sessions.status IS '세션 상태 (scheduled, live, ended)';

-- =====================================================
-- 2. CHAT MESSAGES TABLE
-- =====================================================
-- Stores chat messages during live sessions

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Comments
COMMENT ON TABLE public.chat_messages IS '실시간 강의 채팅 메시지';
COMMENT ON COLUMN public.chat_messages.session_id IS '세션 ID (nullable: 일반 채팅 지원)';

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

-- Trigger: Update updated_at on live_sessions
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

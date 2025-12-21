import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Courses from '../../pages/Courses'
import Profile from '../../pages/Profile'
import Dashboard from '../../pages/Dashboard'
import PaymentHistory from '../../pages/PaymentHistory'

/**
 * RPG 스타일 메타버스 UI 오버레이
 * - Tab 키로 열기/닫기
 * - 아이콘 기반 세로 메뉴
 * - 게임 UI 느낌의 디자인
 */
export default function MetaverseUI({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('courses')

  if (!isOpen) return null

  const handleExitMetaverse = () => {
    navigate('/dashboard')
  }

  const tabs = [
    { id: 'courses', label: '강의', icon: '📚', color: '#f59e0b' },
    { id: 'dashboard', label: '대시보드', icon: '📊', color: '#3b82f6' },
    { id: 'profile', label: '프로필', icon: '⚔️', color: '#10b981' },
    { id: 'payment', label: '상점', icon: '💰', color: '#8b5cf6' },
  ]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-auto"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* RPG 스타일 메인 컨테이너 */}
      <div
        className="relative flex gap-4"
        style={{
          width: '95%',
          height: '90%',
          maxWidth: '1400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 왼쪽: 세로 아이콘 메뉴 */}
        <div
          className="flex flex-col gap-3 p-4 rounded-lg"
          style={{
            width: '120px',
            background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
            border: '3px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* 메뉴 타이틀 */}
          <div
            className="text-center py-3 mb-2 rounded"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              color: '#ffd700',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
              letterSpacing: '1px',
            }}
          >
            MENU
          </div>

          {/* 아이콘 메뉴 버튼들 */}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-2 py-4 rounded-lg transition-all"
              style={{
                background: activeTab === tab.id
                  ? `linear-gradient(135deg, ${tab.color}40 0%, ${tab.color}20 100%)`
                  : 'rgba(255, 255, 255, 0.03)',
                border: activeTab === tab.id
                  ? `3px solid ${tab.color}`
                  : '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: activeTab === tab.id
                  ? `0 0 20px ${tab.color}80, inset 0 0 15px ${tab.color}30`
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: '32px', filter: activeTab === tab.id ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' : 'none' }}>
                {tab.icon}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: activeTab === tab.id ? tab.color : '#9ca3af',
                  textShadow: activeTab === tab.id ? `0 0 10px ${tab.color}` : 'none',
                }}
              >
                {tab.label}
              </div>
            </button>
          ))}

          {/* 나가기 버튼 */}
          <button
            onClick={handleExitMetaverse}
            className="mt-auto py-3 rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
            }}
          >
            🚪<br />메타버스<br/>나가기
          </button>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="mt-2 py-3 rounded-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(239, 68, 68, 0.1) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            }}
          >
            ✕<br />닫기
          </button>
        </div>

        {/* 오른쪽: 컨텐츠 패널 */}
        <div
          className="flex-1 rounded-lg overflow-hidden flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(25, 25, 35, 0.98) 0%, rgba(15, 15, 25, 0.98) 100%)',
            border: '3px solid rgba(255, 215, 0, 0.3)',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* 패널 헤더 */}
          <div
            className="px-6 py-4 border-b"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.05) 100%)',
              borderColor: 'rgba(255, 215, 0, 0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <div style={{ fontSize: '36px' }}>
                {tabs.find(t => t.id === activeTab)?.icon}
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: tabs.find(t => t.id === activeTab)?.color,
                    textShadow: `0 0 15px ${tabs.find(t => t.id === activeTab)?.color}`,
                  }}
                >
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                  Tab 키를 눌러 메뉴 닫기
                </p>
              </div>
            </div>
          </div>

          {/* 컨텐츠 영역 */}
          <div
            className="flex-1 overflow-y-auto p-6"
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {activeTab === 'courses' && <Courses />}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'profile' && <Profile />}
            {activeTab === 'payment' && <PaymentHistory />}
          </div>

          {/* 패널 푸터 (장식용) */}
          <div
            className="px-6 py-3 border-t text-center"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 215, 0, 0.03) 50%, rgba(255, 215, 0, 0.08) 100%)',
              borderColor: 'rgba(255, 215, 0, 0.2)',
              color: '#6b7280',
              fontSize: '11px',
            }}
          >
            VerseUp! Metaverse System
          </div>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

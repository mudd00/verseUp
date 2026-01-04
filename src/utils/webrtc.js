/**
 * WebRTC ICE 서버 설정
 * STUN + TURN 서버를 환경변수 또는 기본값으로 구성
 */
export function getIceServers() {
  const iceServers = [
    // Google Public STUN Servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  // 환경변수에서 TURN 서버 설정 가져오기
  const turnUrl = import.meta.env.VITE_TURN_SERVER_URL
  const turnUsername = import.meta.env.VITE_TURN_USERNAME
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL

  // 환경변수에 TURN 서버가 설정되어 있으면 추가
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    })
    console.log('🔄 [WebRTC] Using configured TURN server')
  } else {
    // 무료 공개 TURN 서버 사용 (OpenRelay - 테스트/소규모용)
    // https://www.metered.ca/tools/openrelay/
    iceServers.push(
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    )
    console.log('🔄 [WebRTC] Using OpenRelay free TURN servers')
  }

  return iceServers
}

/**
 * RTCPeerConnection 설정 객체 반환
 */
export function getRTCConfiguration() {
  return {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 10, // ICE 후보 풀 크기 증가
  }
}

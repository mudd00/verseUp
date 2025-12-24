import { socketService } from './socket'

class CCTVService {
  constructor() {
    this.peerConnections = new Map() // socketId -> RTCPeerConnection
    this.localStream = null
    this.onStreamCallback = null
    this.onViewerChangeCallback = null
  }

  /**
   * Enable CCTV for a classroom (instructor only)
   */
  enableCCTV(classroomId) {
    socketService.emit('cctv:enable', { classroomId })
  }

  /**
   * Disable CCTV for a classroom (instructor only)
   */
  disableCCTV(classroomId) {
    socketService.emit('cctv:disable', { classroomId })
  }

  /**
   * Request to view CCTV (parent only)
   */
  requestCCTV(classroomId, studentId) {
    socketService.emit('cctv:request', { classroomId, studentId })
  }

  /**
   * Stop viewing CCTV
   */
  stopViewing(classroomId) {
    socketService.emit('cctv:stop-viewing', { classroomId })
    this.cleanup()
  }

  /**
   * Get CCTV status for a classroom
   */
  getStatus(classroomId) {
    socketService.emit('cctv:status', { classroomId })
  }

  /**
   * Start broadcasting CCTV stream (from metaverse camera)
   */
  async startBroadcasting(stream) {
    this.localStream = stream
    console.log('CCTV: Started broadcasting with stream')
  }

  /**
   * Stop broadcasting CCTV stream
   */
  stopBroadcasting() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }
    this.cleanup()
  }

  /**
   * Create peer connection for a viewer
   */
  async createConnectionForViewer(viewerSocketId, classroomId) {
    if (!this.localStream) {
      console.error('CCTV: No local stream to broadcast')
      return
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    // Add local stream tracks
    this.localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, this.localStream)
    })

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('cctv:ice-candidate', {
          targetSocketId: viewerSocketId,
          candidate: event.candidate,
        })
      }
    }

    // Create and send offer
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    socketService.emit('cctv:offer', {
      targetSocketId: viewerSocketId,
      offer,
      classroomId,
    })

    this.peerConnections.set(viewerSocketId, peerConnection)
  }

  /**
   * Handle incoming offer (for viewers)
   */
  async handleOffer(fromSocketId, offer) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('CCTV: Received remote stream')
      if (this.onStreamCallback) {
        this.onStreamCallback(event.streams[0])
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('cctv:ice-candidate', {
          targetSocketId: fromSocketId,
          candidate: event.candidate,
        })
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socketService.emit('cctv:answer', {
      targetSocketId: fromSocketId,
      answer,
    })

    this.peerConnections.set(fromSocketId, peerConnection)
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(fromSocketId, answer) {
    const peerConnection = this.peerConnections.get(fromSocketId)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(fromSocketId, candidate) {
    const peerConnection = this.peerConnections.get(fromSocketId)
    if (peerConnection && candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  /**
   * Set callback for receiving stream
   */
  onStream(callback) {
    this.onStreamCallback = callback
  }

  /**
   * Set callback for viewer count changes
   */
  onViewerChange(callback) {
    this.onViewerChangeCallback = callback
  }

  /**
   * Setup socket event listeners
   */
  setupListeners() {
    socketService.on('cctv:offer', async (data) => {
      await this.handleOffer(data.fromSocketId, data.offer)
    })

    socketService.on('cctv:answer', async (data) => {
      await this.handleAnswer(data.fromSocketId, data.answer)
    })

    socketService.on('cctv:ice-candidate', async (data) => {
      await this.handleIceCandidate(data.fromSocketId, data.candidate)
    })

    socketService.on('cctv:viewer-joined', (data) => {
      console.log('CCTV: Viewer joined', data)
      if (this.localStream && data.viewerSocketId) {
        // Create connection for new viewer
        // Note: viewerSocketId might not be available, in that case broadcaster handles it differently
      }
      if (this.onViewerChangeCallback) {
        this.onViewerChangeCallback(data.viewerCount)
      }
    })

    socketService.on('cctv:viewer-left', (data) => {
      console.log('CCTV: Viewer left', data)
      if (this.onViewerChangeCallback) {
        this.onViewerChangeCallback(data.viewerCount)
      }
    })
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    this.peerConnections.forEach((pc) => pc.close())
    this.peerConnections.clear()
  }
}

export const cctvService = new CCTVService()

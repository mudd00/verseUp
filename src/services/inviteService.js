import api from './api'

class InviteService {
  /**
   * Generate a new parent invite code (student only)
   */
  async generate() {
    return api.post('/invites/generate', {})
  }

  /**
   * Validate an invite code (public)
   */
  async validate(inviteCode) {
    return api.post('/invites/validate', { inviteCode })
  }

  /**
   * Get my created invite codes (student only)
   */
  async getMyInvites() {
    return api.get('/invites/my')
  }

  /**
   * Revoke an invite code (student only)
   */
  async revoke(code) {
    return api.delete(`/invites/${code}`)
  }

  /**
   * Get connected parents (student only)
   */
  async getConnectedParents() {
    return api.get('/invites/connected-parents')
  }

  /**
   * Disconnect a parent (student only)
   */
  async disconnectParent(linkId) {
    return api.delete(`/invites/disconnect/${linkId}`)
  }
}

export const inviteService = new InviteService()
export default inviteService

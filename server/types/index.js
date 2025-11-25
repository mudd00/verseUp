/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {'student'|'instructor'|'admin'} role
 * @property {string} [avatarUrl]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Course
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} instructorId
 * @property {string} [thumbnail]
 * @property {number} maxStudents
 * @property {number} enrolledCount
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} createdAt
 */

/**
 * @typedef {Object} LiveSession
 * @property {string} id
 * @property {string} courseId
 * @property {string} title
 * @property {string} [description]
 * @property {string} scheduledAt
 * @property {number} duration
 * @property {'scheduled'|'live'|'ended'} status
 * @property {string} [streamUrl]
 * @property {string} [recordingUrl]
 */

/**
 * @typedef {Object} SocketUser
 * @property {string} id
 * @property {string} socketId
 * @property {User} user
 * @property {string} [roomId]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {string} message
 * @property {string} timestamp
 * @property {'text'|'system'} type
 */

export {}

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
 * @typedef {Object} CourseSchedule
 * @property {0|1|2|3|4|5|6} dayOfWeek - 0=일요일, 1=월요일, ..., 6=토요일
 * @property {string} startTime - "HH:mm" 형식 (예: "14:00")
 * @property {string} endTime - "HH:mm" 형식 (예: "16:00")
 */

/**
 * @typedef {Object} Course
 * @property {string} id
 * @property {string} courseCode
 * @property {string} title
 * @property {string} description
 * @property {string} instructorId
 * @property {User} [instructor]
 * @property {string} [thumbnail]
 * @property {number} maxStudents
 * @property {number} enrolledCount
 * @property {string} startDate
 * @property {string} endDate
 * @property {CourseSchedule[]} [schedule]
 * @property {string} [category]
 * @property {'beginner'|'intermediate'|'advanced'} [level]
 * @property {'draft'|'published'|'archived'} [status]
 * @property {number} [price]
 * @property {string} createdAt
 * @property {string} [updatedAt]
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
 * @typedef {Object} AuthState
 * @property {User|null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 */

/**
 * @typedef {Object} PeerConnection
 * @property {string} userId
 * @property {RTCPeerConnection} connection
 * @property {MediaStream} [stream]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} userId
 * @property {User} user
 * @property {string} message
 * @property {string} timestamp
 * @property {'text'|'system'} type
 */

/**
 * @typedef {Object} Enrollment
 * @property {string} id
 * @property {string} studentId
 * @property {string} courseId
 * @property {Course} [course]
 * @property {'active'|'completed'|'dropped'} status
 * @property {string} enrolledAt
 * @property {string} [completedAt]
 */

export {}

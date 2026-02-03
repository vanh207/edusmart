import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // Increased for AI responses
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('Cannot connect to server. Make sure the backend is running on port 5000');
      return Promise.reject(new Error('Không thể kết nối đến server. Vui lòng kiểm tra server đã chạy chưa.'));
    }
    return Promise.reject(error);
  }
)

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token')
    console.log(`[API Request] Path: ${config.url}, Method: ${config.method}, HasToken: ${!!token}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      console.warn(`[API Request] No token found for authenticated path: ${config.url}`);
    }
  }
  return config
})

export const authAPI = {
  login: (username: string, password: string, role: string) =>
    api.post('/auth/login', { username, password, role }),
  register: (data: any) => api.post('/auth/register', data),
  registerTeacher: (data: any) => api.post('/auth/register-teacher', data),
  requestOTP: (data: { identifier: string; username?: string; purpose: 'register' | 'reset_password'; temp_data?: any }) =>
    api.post('/auth/request-otp', data),
  verifyOTP: (data: { identifier: string; otp: string; purpose: 'register' | 'reset_password'; new_password?: string }) =>
    api.post('/auth/verify-otp', data),
  loginFirebase: (idToken: string) => api.post('/auth/login-firebase', { idToken }),
  registerFirebase: (idToken: string, extraData: any) => api.post('/auth/register-firebase', { idToken, ...extraData }),
}

export const aiAPI = {
  chat: (data: string | FormData, context?: string) => {
    if (data instanceof FormData) {
      return api.post('/ai/chat', data)
    }
    return api.post('/ai/chat', { message: data, context })
  },
  checkWriting: (word: string, userInput: string) => api.post('/ai/check-writing', { word, userInput }),
}

export const lessonsAPI = {
  getAll: (params?: { grade_level?: string; subject?: string }) =>
    api.get('/lessons', { params }),
  getById: (id: number) => api.get(`/lessons/${id}`),
}

export const exercisesAPI = {
  getAll: (params?: { grade_level?: string; subject?: string; search?: string; lesson_id?: number }) =>
    api.get('/exercises', { params }),
  getByLesson: (lessonId: number) => api.get(`/exercises`, { params: { lesson_id: lessonId } }),
  getQuestions: (setId: number) => api.get(`/exercises/${setId}`),
  submit: (payload: { exercise_id: number, answers: string[], study_time?: number, file_url?: string, start_time?: string | null }) =>
    api.post('/exercises/submit', payload),
  submitIndividual: (questionId: number, answers: string[], studyTime?: number, file_url?: string) =>
    api.post(`/exercises/${questionId}/submit`, { answers, studyTime, file_url }),
}

export const vocabularyAPI = {
  getAll: (params?: { grade_level?: string; subject?: string; search?: string; type?: string }) =>
    api.get('/vocabulary', { params }),
  recordProgress: (data: { vocabulary_id: number, type: 'reading' | 'writing' | 'speaking', score: number }) => api.post('/vocabulary/progress', data),
}

export const leaderboardAPI = {
  get: () => api.get('/leaderboard'),
}

export const locationAPI = {
  getProvinces: () => api.get('/location/provinces'),
  getDistricts: (provinceId: number) => api.get(`/location/districts/${provinceId}`),
  getWards: (districtId: number) => api.get(`/location/wards/${districtId}`),
  getSchools: (districtId: number) => api.get(`/location/schools/${districtId}`),
}

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getProgress: () => api.get('/user/progress'),
  getTestResults: () => api.get('/user/test-results'),
  updateProfile: (data: any) => api.post('/user/profile', data),
  logStudyTime: (lesson_id: number | null, study_time: number) => api.post('/user/study-time', { lesson_id, study_time }),
  uploadAvatar: (formData: FormData) => api.post('/user/avatar', formData),
  reportViolation: (data: FormData) => api.post('/user/violation', data),
  uploadSubmissionFile: (formData: FormData) => api.post('/user/upload-submission', formData),
  submitFeedback: (data: { subject: string; message: string; image?: File }) => {
    if (data.image) {
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('message', data.message);
      formData.append('image', data.image);
      return api.post('/feedback', formData);
    }
    return api.post('/feedback', data);
  },
  getAnnouncements: () => api.get('/announcements'),
  markAnnouncementRead: (id: number) => api.post(`/announcements/${id}/read`),
  getAchievements: () => api.get('/user/achievements'),
}

export const testsAPI = {
  getAll: () => api.get('/tests'),
  getById: (id: number) => api.get(`/tests/${id}`),
  submit: (testId: number, answers: any[], start_time?: string | null) => api.post('/tests/submit', { test_id: testId, answers, start_time }),
}

export const learningPathsAPI = {
  getAll: (params?: { grade_level?: string; subject?: string }) =>
    api.get('/learning-paths', { params }),
  getById: (id: number) => api.get(`/learning-paths/${id}`),
  updateProgress: (path_id: number, step_id: number, completed: boolean) => api.post('/learning-paths/progress', { path_id, step_id, completed }),
}

export const adminAPI = {
  getStatistics: () => api.get('/admin/statistics'),
  registerUser: (data: any) => api.post('/admin/register', data),
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  getStudentMonitoring: () => api.get('/admin/students/monitoring'),
  updateUser: (id: number, data: any) => api.post(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  getLessons: (params?: any) => api.get('/admin/lessons', { params }),
  deleteLesson: (id: number) => api.delete(`/admin/lessons/${id}`),
  createLesson: (data: FormData) => api.post('/admin/lessons', data),
  updateLesson: (id: number, data: FormData) => api.put(`/admin/lessons/${id}`, data),

  getExercises: (params?: any) => api.get('/admin/exercises', { params }),
  deleteExercise: (id: number) => api.delete(`/admin/exercises/${id}`),
  createExercise: (data: any) => api.post('/admin/exercises', data),
  updateExercise: (id: number, data: any) => api.put(`/admin/exercises/${id}`, data),

  getTests: (params?: any) => api.get('/admin/tests', { params }),
  deleteTest: (id: number) => api.delete(`/admin/tests/${id}`),
  createTest: (data: any) => api.post('/admin/tests', data),
  updateTest: (id: number, data: any) => api.put(`/admin/tests/${id}`, data),

  getVocabularyList: (params?: any) => api.get('/admin/vocabulary', { params }),
  deleteVocabulary: (id: number) => api.delete(`/admin/vocabulary/${id}`),
  createVocabulary: (data: FormData) => api.post('/admin/vocabulary', data),
  updateVocabulary: (id: number, data: any) => api.put(`/admin/vocabulary/${id}`, data),

  getViolations: (params?: any) => api.get('/admin/violations', { params }),
  getViolationsByUser: (userId: number) => api.get(`/admin/violations/user/${userId}`),
  deleteViolation: (id: number) => api.delete(`/admin/violations/${id}`),
  deleteAllViolations: () => api.delete('/admin/violations/all'),
  scanViolation: (id: number) => api.post(`/admin/violations/scan/${id}`),
  toggleProctoring: (enabled: boolean) => api.post('/admin/settings/proctoring', { enabled }),
  toggleSocialMonitoring: (enabled: boolean) => api.post('/admin/settings/social-monitoring', { enabled }),
  toggleTestMonitoring: (enabled: boolean) => api.post('/admin/settings/test-monitoring', { enabled }),
  getProctoringStatus: (schoolId?: number) => api.get('/settings/proctoring', { params: { school_id: schoolId } }),
  toggleTeacherAccess: (id: number, is_full_access: boolean) => api.post(`/admin/users/${id}/toggle-access`, { is_full_access }),
  aiGenerate: (formData: FormData) => api.post('/admin/ai-generate', formData),
  getParticipation: (params: any) => api.get('/admin/participation', { params }),
  deleteParticipation: (type: string, id: number) => api.delete(`/admin/participation/${type}/${id}`),
  gradeParticipation: (data: { type: 'test' | 'exercise', id: number, score: number }) => api.post('/admin/participation/grade', data),
  getVocabularyParticipation: (id: number, params?: any) => api.get(`/admin/vocabulary/${id}/participation`, { params }),

  getLearningPaths: (params?: any) => api.get('/admin/learning-paths', { params }),
  deleteLearningPath: (id: number) => api.delete(`/admin/learning-paths/${id}`),
  createLearningPath: (data: any) => api.post('/admin/learning-paths', data),
  performCleanup: () => api.post('/admin/maintenance/cleanup'),
  getActivityLogs: () => api.get('/admin/activity-logs'),

  // Classes
  getClasses: () => api.get('/admin/classes'),
  createClass: (data: any) => api.post('/admin/classes', data),
  updateClass: (id: number, data: any) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id: number) => api.delete(`/admin/classes/${id}`),
  getClassStudents: (id: number) => api.get(`/classes/${id}/students`),

  // Questions
  uploadQuestionAudio: (formData: FormData) => api.post('/admin/questions/audio', formData),

  verifySocialViolation: (formData: FormData) => api.post('/admin/violations/verify-social', formData),
  purgeViolations: () => api.post('/admin/violations/purge-all'),

  // Announcements
  getAnnouncements: () => api.get('/announcements'),
  createAnnouncement: (data: any) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id: number) => api.delete(`/admin/announcements/${id}`),

  // Feedback (Proxied from superAdmin for convenience if needed)
  getFeedback: () => api.get('/super-admin/feedback'),
  analyzeFeedback: () => api.get('/super-admin/feedback/analysis'),

  // Data Management
  exportData: (type: 'schools' | 'students' | 'staff') => api.get(`/admin/export/${type}`, { responseType: 'blob' }),
  importUsers: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/import/users', formData);
  }
}

export const superAdminAPI = {
  getStats: () => api.get('/super-admin/stats'),
  getSchools: () => api.get('/super-admin/schools'),
  createSchool: (data: { name: string; levels: string; province?: string; district?: string; ward?: string; address?: string }) => api.post('/super-admin/schools', data),
  deleteSchool: (id: number) => api.delete(`/super-admin/schools/${id}`),
  cleanupSchools: () => api.post('/super-admin/cleanup-schools'),
  getFeedback: () => api.get('/super-admin/feedback'),
  resolveFeedback: (id: number) => api.put(`/super-admin/feedback/${id}/resolve`),
  getFeedbackAnalysis: () => api.get('/super-admin/feedback/analysis'),
  analyzeFeedback: () => api.get('/super-admin/feedback/analysis'),
}

export const pronunciationAPI = {
  checkPronunciation: (word: string, userInput: string) =>
    api.post('/ai/check-pronunciation', { word, userInput }),
}

export const gradesAPI = {
  // Teacher endpoints
  createGrade: (data: {
    student_id: number
    class_id: number
    subject: string
    semester: number
    year: string
    grade_type: 'oral' | 'quiz_15' | 'test_45' | 'midterm' | 'final'
    score: number
    note?: string
  }) => api.post('/teacher/grades', data),

  getClassGrades: (classId: number, params?: { subject?: string; semester?: number; year?: string }) =>
    api.get(`/teacher/grades/${classId}`, { params }),

  updateGrade: (id: number, data: { score: number; note?: string; semester?: number; year?: string }) =>
    api.put(`/teacher/grades/${id}`, data),

  deleteGrade: (id: number) => api.delete(`/teacher/grades/${id}`),

  getClassStudents: (classId: number) => api.get(`/teacher/students/${classId}`),

  // Student endpoint
  getMyGrades: (params?: { semester?: number; year?: string; subject?: string }) =>
    api.get('/student/grades', { params }),
}

export default api

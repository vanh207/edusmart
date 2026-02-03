// Grades API - Thêm vào cuối file client/lib/api.ts

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

    updateGrade: (id: number, data: { score: number; note?: string }) =>
        api.put(`/teacher/grades/${id}`, data),

    deleteGrade: (id: number) => api.delete(`/teacher/grades/${id}`),

    getClassStudents: (classId: number) => api.get(`/teacher/students/${classId}`),

    // Student endpoint
    getMyGrades: (params?: { semester?: number; year?: string; subject?: string }) =>
        api.get('/student/grades', { params }),
}

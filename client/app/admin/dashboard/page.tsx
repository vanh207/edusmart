'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  BookOpen,
  Target,
  Book,
  CheckCircle2,
  CheckCircle,
  BarChart3,
  Users,
  FileText,
  Award,
  LogOut,
  TrendingUp,
  UserPlus,
  Trash2,
  Shield,
  AlertCircle,
  Wrench,
  RefreshCcw,
  Search,
  Menu,
  X,
  Plus,
  Settings,
  Bell,
  GraduationCap,
  Calendar,
  Briefcase,
  ListChecks,
  SwitchCamera,
  ChevronRight,
  Sparkles,
  Eye,
  Filter,
  User,
  FileUp,
  Wifi,
  WifiOff,
  Trophy,
  Flame,
  UserCircle,
  Map as MapIcon,
  Globe,
  School as SchoolIcon,
  ArrowRight,
  Zap,
  RotateCcw,
  ShieldAlert,
  Pencil,
  Save,
  Trash2 as TrashIcon,
  Info,
  Music,
  Headphones,
  Mic,
  Paperclip,
  MessageSquare,
  Download
} from 'lucide-react'
import { provinces, districtsByProvince, wardsByDistrict, schoolsByProvince, getGenericSchools } from '@/lib/locationData'
import ThemeToggle from '@/components/ThemeToggle'
import { adminAPI, userAPI, leaderboardAPI, API_URL, default as api, gradesAPI } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import NotificationBell from '@/components/NotificationBell'
import ChatbotWidget from '@/components/ChatbotWidget'
import { io } from 'socket.io-client'
import LoadingSpinner from '@/components/LoadingSpinner'
import AnnouncementModal from '@/components/AnnouncementModal'

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'statistics' | 'students' | 'staff' | 'lesson' | 'exercise' | 'test' | 'vocabulary' | 'ai-generate' | 'leaderboard' | 'violations' | 'activity-logs' | 'classes' | 'announcements' | 'data-management' | 'feedback' | 'grades'>('statistics')
  const [formData, setFormData] = useState<any>({})
  const [file, setFile] = useState<File | null>(null)
  const [statistics, setStatistics] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const [classNameFilter, setClassNameFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [registerFormData, setRegisterFormData] = useState<any>({ role: 'student' })
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [violations, setViolations] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isGlobalProctoring, setIsGlobalProctoring] = useState(false)
  const [isGlobalSocialMonitoring, setIsGlobalSocialMonitoring] = useState(false)
  const [isGlobalTestMonitoring, setIsGlobalTestMonitoring] = useState(false)
  const [showMonitoringSettings, setShowMonitoringSettings] = useState(false)
  const [aiGeneratedContent, setAiGeneratedContent] = useState<any>(null)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [editFormData, setEditFormData] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [exercisesData, setExercisesData] = useState<any[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [vocabList, setVocabList] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', ''])
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0)
  const [questionsList, setQuestionsList] = useState<any[]>([])
  const [participationResults, setParticipationResults] = useState<any[]>([])
  const [showParticipationModal, setShowParticipationModal] = useState(false)
  const [selectedResultItem, setSelectedResultItem] = useState<any>(null)
  const [resultFilters, setResultFilters] = useState<any>({ type: 'test' })
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [manualScore, setManualScore] = useState<number>(0)
  const [studentMonitoring, setStudentMonitoring] = useState<any[]>([])
  const [monitoringGradeFilter, setMonitoringGradeFilter] = useState<string>('')
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [staffSpecializationFilter, setStaffSpecializationFilter] = useState<string>('')
  const [vocabParticipation, setVocabParticipation] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; title: string; message: React.ReactNode; onConfirm: () => void } | null>(null)


  // AI Monitoring & Class Management States
  const [classes, setClasses] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any>(null)
  const [socket, setSocket] = useState<any>(null)
  const [monitoringFilter, setMonitoringFilter] = useState({
    status: 'all',
    classId: 'all',
    grade: 'all'
  })

  // AI Chatbot States
  const [aiChatStep, setAiChatStep] = useState<number>(0)
  const [aiChatMessages, setAiChatMessages] = useState<any[]>([
    { role: 'ai', content: 'Chào mừng quý thầy cô! Em là trợ lý AI. Thầy cô muốn em hỗ trợ tạo nội dung gì hôm nay ạ?', type: 'greet' }
  ])
  const [isAITyping, setIsAITyping] = useState(false)
  const [aiPreviewData, setAiPreviewData] = useState<any>(null)
  const [showMetadataForm, setShowMetadataForm] = useState(false)
  const [contentFilters, setContentFilters] = useState({
    search: '',
    grade_level: '',
    subject: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [violationSearchQuery, setViolationSearchQuery] = useState('')
  const [violationTypeFilter, setViolationTypeFilter] = useState('all')
  const [violationClassFilter, setViolationClassFilter] = useState('all')

  // Class Management UI States
  const [showClassModal, setShowClassModal] = useState(false)
  const [classFormData, setClassFormData] = useState<any>({ name: '', grade_level: '', teacher_id: '' })
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [classStudents, setClassStudents] = useState<any[]>([])
  const [showClassStudentsView, setShowClassStudentsView] = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: '',
    content: '',
    type: 'info',
    target_role: 'all',
    expires_at: ''
  })
  const [feedbackList, setFeedbackList] = useState<any[]>([])
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [importingUsers, setImportingUsers] = useState(false)
  const [classGrades, setClassGrades] = useState<any[]>([])
  const [gradeClassStudents, setGradeClassStudents] = useState<any[]>([])
  const [selectedClassForGrades, setSelectedClassForGrades] = useState<any>(null)
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false)
  const [gradeFilters, setGradeFilters] = useState({
    subject: 'anh',
    semester: 1,
    year: '2025-2026'
  })
  const [currentGradeForm, setCurrentGradeForm] = useState<any>({
    student_id: 0,
    score: 0,
    grade_type: 'quiz_15',
    note: '',
    semester: 1,
    year: ''
  })

  const filteredViolations = violations.filter(v => {
    const matchesSearch = !violationSearchQuery ||
      v.username?.toLowerCase().includes(violationSearchQuery.toLowerCase()) ||
      v.full_name?.toLowerCase().includes(violationSearchQuery.toLowerCase()) ||
      v.item_title?.toLowerCase().includes(violationSearchQuery.toLowerCase())

    const matchesType = violationTypeFilter === 'all' || v.violation_type === violationTypeFilter
    const matchesClass = violationClassFilter === 'all' || String(v.current_class_id) === violationClassFilter

    return matchesSearch && matchesType && matchesClass
  })

  // Calculate unique class names for students
  const availableClasses = useMemo(() => {
    const studentClasses = allUsers
      .filter(u => u.role === 'student' && u.class_name)
      .map(u => u.class_name.toUpperCase());
    return Array.from(new Set(studentClasses)).sort();
  }, [allUsers]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await userAPI.getProfile()
        const userData = response.data
        if (userData.role !== 'admin' && userData.role !== 'teacher') {
          router.push('/login/admin')
          return
        }
        setUser(userData)
        sessionStorage.setItem('user', JSON.stringify(userData))

        // Join school room as soon as we have school_id
        if (userData.school_id && socket) {
          socket.emit('join-school-room', userData.school_id)
          console.log('Joining school room in fetchData:', userData.school_id)
        }

        // Auto-purge violations when Admin starts the dashboard
        if (userData.role === 'admin' || userData.role === 'teacher') {
          try {
            await adminAPI.purgeViolations()
            console.log('Successfully purged violations on dashboard start')
          } catch (purgeErr) {
            console.error('Failed to auto-purge violations:', purgeErr)
          }
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error)
        router.push('/login/admin')
      }
    }

    fetchData()
    loadStatistics()
    loadClasses()
    loadGlobalSettings()
    loadAnnouncements()
    if (user?.is_super_admin === 1) {
      loadFeedbackList()
    }

    // Initialize Socket
    const newSocket = io(API_URL)
    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Admin connected to socket')
      // If user profile is already loaded, join school room immediately
      const savedUser = sessionStorage.getItem('user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          if (parsedUser.school_id) {
            newSocket.emit('join-school-room', parsedUser.school_id)
            console.log('Joining school room on socket connect:', parsedUser.school_id)
          }
        } catch (e) {
          console.error('Failed to parse saved user for socket room joining', e)
        }
      }
    })



    newSocket.on('new-violation-record', (violation) => {
      console.log('Real-time violation record received:', violation);
      setViolations(prev => {
        // Double-check ID to prevent duplicate if both proxy and AI emit (though AI uses violation-updated)
        if (prev.find(v => v.id === violation.id)) return prev;
        return [violation, ...prev];
      });
      toast(`CẢNH BÁO: Phát hiện vi phạm mới (${violation.violation_type})`, 'warning');
      loadStudentMonitoring();
    })

    newSocket.on('violation-updated', (updated) => {
      console.log('Violation AI Scan update:', updated);
      setViolations(prev => prev.map(v => v.id === updated.id ? { ...v, ...updated } : v));
    })

    newSocket.on('user-updated', (data) => {
      console.log('Real-time user update received:', data);
      loadUsers();
      if (data.type === 'register' || data.type === 'delete') {
        loadStatistics();
      }
    })

    newSocket.on('classes-updated', () => {
      console.log('Real-time class update received');
      loadClasses();
    })

    newSocket.on('violation-deleted-sync', (data) => {
      console.log('Violations purged for inactive user:', data.userId);
      setViolations(prev => prev.filter(v => v.user_id !== data.userId));
    })

    newSocket.on('violations-purged', () => {
      console.log('All violations purged by admin');
      setViolations([]);
      toast('Toàn bộ lịch sử vi phạm đã được dọn dẹp', 'info');
    })

    newSocket.on('monitoring-sync', ({ type, enabled }) => {
      console.log('Real-time monitoring sync received:', type, enabled);
      if (type === 'ai' || type === 'study') setIsGlobalProctoring(enabled);
      if (type === 'social') setIsGlobalSocialMonitoring(enabled);
      if (type === 'test') setIsGlobalTestMonitoring(enabled);
    })

    return () => {
      newSocket.disconnect()
    }
  }, [router])

  const handleQuestionAudioUpload = async (qIdx: number, file: File) => {
    try {
      setLoading(true)
      const uploadFormData = new FormData()
      uploadFormData.append('type', 'questions')
      uploadFormData.append('audio', file)

      const response = await adminAPI.uploadQuestionAudio(uploadFormData)
      const audioUrl = response.data.url

      const newList = [...questionsList]
      newList[qIdx].audio_url = audioUrl
      setQuestionsList(newList)

      toast("Tải lên thành công: File nghe đã được gắn vào câu hỏi.", "success")
    } catch (error: any) {
      console.error('Audio upload error:', error)
      toast("Lỗi tải âm thanh: " + (error.response?.data?.error || "Không thể tải lên file audio"), "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (socket) {
      console.log('Admin joining monitoring rooms...')
      socket.emit('join-room', 'global_proctoring')
      socket.emit('join-room', 'monitoring_global') // Student fallback (Legacy)

      if (classes.length > 0) {
        classes.forEach(c => {
          socket.emit('join-room', `monitoring_${c.id}`)
        })
      }
    }
  }, [socket, classes])

  const loadClasses = async () => {
    try {
      const res = await adminAPI.getClasses()
      setClasses(res.data)
    } catch (err) {
      console.error('Error loading classes:', err)
    }
  }

  const loadGlobalSettings = async () => {
    try {
      const res = await adminAPI.getProctoringStatus()
      if (res.data) {
        setIsGlobalProctoring(res.data.proctoring_enabled === true || res.data.proctoring_enabled === '1' || res.data.proctoring_enabled === 1)
        setIsGlobalSocialMonitoring(res.data.social_monitoring_enabled === true || res.data.social_monitoring_enabled === '1' || res.data.social_monitoring_enabled === 1)
        setIsGlobalTestMonitoring(res.data.test_monitoring_enabled === true || res.data.test_monitoring_enabled === '1' || res.data.test_monitoring_enabled === 1)
      }
    } catch (err) {
      console.error('Error loading global settings:', err)
    }
  }

  const handleToggleMonitoring = async (classId: number, type: 'study' | 'test' | 'social', value: boolean) => {
    setLoading(true)
    try {
      const field = type === 'study' ? 'study_monitoring_enabled' :
        type === 'test' ? 'test_monitoring_enabled' :
          'social_monitoring_enabled';

      await adminAPI.updateClass(classId, {
        [field]: value ? 1 : 0
      })

      await loadClasses()

      const socketType = type === 'study' ? 'ai' : type;
      // Include school_id in roomId to ensure school isolation
      const roomId = user?.school_id ? `school_${user.school_id}_class_${classId}` : `monitoring_${classId}`;
      console.log(`📡 [Admin] Emitting monitoring-sync to room: ${roomId}`, { type: socketType, enabled: value });
      socket?.emit('monitoring-sync', { roomId, type: socketType, enabled: value })

      toast(`Đã ${value ? 'bật' : 'tắt'} giám sát ${type === 'study' ? 'học tập' : type === 'test' ? 'thi cử' : 'mạng xã hội'}`, 'success')
    } catch (err) {
      console.error('Toggle monitoring error:', err)
      toast('Không thể cập nhật trạng thái giám sát', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'staff') {
      loadUsers()
    } else if (activeTab === 'statistics') {
      loadViolations()
    } else if (activeTab === 'lesson') {
      loadLessons()
    } else if (activeTab === 'exercise') {
      loadExercises()
      loadLessons()
    } else if (activeTab === 'test') {
      loadTests()
    } else if (activeTab === 'vocabulary') {
      loadVocabulary()
    } else if (activeTab === 'leaderboard') {
      loadLeaderboard()
    } else if (activeTab === 'violations') {
      loadViolations()
      loadStudentMonitoring()
    } else if (activeTab === 'classes') {
      loadClasses()
    } else if (activeTab === 'activity-logs') {
      loadActivityLogs()
    } else if (activeTab === 'grades') {
      if (selectedClassForGrades) {
        loadClassGrades(selectedClassForGrades.id)
      }
    }
  }, [activeTab, contentFilters])

  // Load students when class is selected for grades
  useEffect(() => {
    const loadGradeStudents = async () => {
      if (selectedClassForGrades?.id) {
        console.log('🔍 [Grades] Loading students for class:', selectedClassForGrades.id)
        try {
          const response = await adminAPI.getClassStudents(selectedClassForGrades.id)
          console.log('✅ [Grades] Students loaded:', response.data.students)
          setGradeClassStudents(response.data.students || [])
        } catch (error) {
          console.error('❌ [Grades] Error loading students:', error)
          setGradeClassStudents([])
        }
      } else {
        setGradeClassStudents([])
      }
    }
    loadGradeStudents()
  }, [selectedClassForGrades])

  // Load students for class students modal
  useEffect(() => {
    const loadClassStudents = async () => {
      if (selectedClass?.id && showClassStudentsView) {
        console.log('🔍 [Class Modal] Loading students for class:', selectedClass.id)
        try {
          const response = await adminAPI.getClassStudents(selectedClass.id)
          console.log('✅ [Class Modal] Students loaded:', response.data.students)
          setClassStudents(response.data.students || [])
        } catch (error) {
          console.error('❌ [Class Modal] Error loading students:', error)
          setClassStudents([])
        }
      } else if (!showClassStudentsView) {
        setClassStudents([])
      }
    }
    loadClassStudents()
  }, [selectedClass, showClassStudentsView])

  useEffect(() => {
  }, [resultFilters.type])

  // Scoring Synchronization Logic
  useEffect(() => {
    if (activeTab === 'test' || activeTab === 'exercise') {
      const sum = questionsList.reduce((acc, q) => acc + (q.points || 0), 0);
      if (sum !== parseFloat(formData.total_score || '0')) {
        setFormData((prev: any) => ({ ...prev, total_score: sum.toString() }));
      }
    }
  }, [questionsList]);

  const handleLogout = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xác nhận đăng xuất',
      message: 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản quản trị?',
      onConfirm: () => {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        router.push('/login/admin')
      }
    })
  }

  const loadLessons = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getLessons(contentFilters)
      setLessons(res.data)
    } catch (err) {
      console.error('Error loading lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadExercises = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getExercises(contentFilters)
      setExercisesData(res.data)
    } catch (err) {
      console.error('Error loading exercises:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentMonitoring = async () => {
    try {
      const res = await adminAPI.getStudentMonitoring()
      setStudentMonitoring(res.data)
    } catch (err) {
      console.error('Error loading monitoring data:', err)
    }
  }

  const loadTests = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getTests(contentFilters)
      setTests(res.data)
    } catch (err) {
      console.error('Error loading tests:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVocabulary = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getVocabularyList(contentFilters)
      setVocabList(res.data)
    } catch (err) {
      console.error('Error loading vocabulary:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadViolations = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getViolations()
      setViolations(response.data)
    } catch (error) {
      console.error('Error loading violations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await leaderboardAPI.get()
      setLeaderboard(response.data.leaderboard || response.data)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActivityLogs = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getActivityLogs()
      setActivityLogs(response.data)
    } catch (error) {
      console.error('Error loading activity logs:', error)
      toast('Không thể tải nhật ký hoạt động', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    try {
      const response = await adminAPI.getStatistics()
      setStatistics(response.data)
      if (response.data) {
        if (response.data.proctoring_enabled !== undefined) {
          setIsGlobalProctoring(response.data.proctoring_enabled === true || response.data.proctoring_enabled === '1' || response.data.proctoring_enabled === 1)
        }
        if (response.data.social_monitoring_enabled !== undefined) {
          setIsGlobalSocialMonitoring(response.data.social_monitoring_enabled === true || response.data.social_monitoring_enabled === '1' || response.data.social_monitoring_enabled === 1)
        }
        if (response.data.test_monitoring_enabled !== undefined) {
          setIsGlobalTestMonitoring(response.data.test_monitoring_enabled === true || response.data.test_monitoring_enabled === '1' || response.data.test_monitoring_enabled === 1)
        }
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const role = activeTab === 'students' ? 'student' : activeTab === 'staff' ? 'teacher' : undefined
      const response = await adminAPI.getUsers(role)
      setAllUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.registerUser(registerFormData)
      toast('Tạo tài khoản thành công!', 'success')
      setShowRegisterForm(false)
      setRegisterFormData({ role: 'student' })
      loadUsers()
      loadStatistics()
    } catch (error: any) {
      toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editFormData || !selectedUser) return
    setLoading(true)
    try {
      await adminAPI.updateUser(selectedUser.id, editFormData)
      toast('Cập nhật người dùng thành công!', 'success')
      setIsEditingUser(false)
      setEditFormData(null)
      setSelectedUser(null)
      loadUsers()
    } catch (error: any) {
      toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xác nhận xóa người dùng',
      message: 'Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(userId)
          toast('Xóa người dùng thành công!', 'success')
          logAction('Quản lý người dùng', `Đã xóa người dùng ID: ${userId}`, 'success')
          loadUsers()
          loadStatistics()
        } catch (error: any) {
          toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleDeleteViolation = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa bản ghi vi phạm',
      message: 'Bạn có chắc chắn muốn xóa bản ghi vi phạm này?',
      onConfirm: async () => {
        try {
          await adminAPI.deleteViolation(id)
          loadViolations()
          toast('Xóa vi phạm thành công', 'success')
          logAction('Giám sát', `Đã xóa bản ghi vi phạm ID: ${id}`, 'info')
        } catch (err) {
          toast('Không thể xóa vi phạm', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleDeleteAllViolations = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa TẤT CẢ bản ghi vi phạm',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử vi phạm của hệ thống? Tất cả ảnh bằng chứng cũng sẽ bị xóa vĩnh viễn.',
      onConfirm: async () => {
        setIsSubmitting(true)
        try {
          await adminAPI.deleteAllViolations()
          setViolations([])
          toast('Đã dọn dẹp toàn bộ vi phạm', 'success')
          logAction('Giám sát', 'Đã xóa toàn bộ lịch sử vi phạm hệ thống', 'warning')
          loadStatistics() // Update counts
        } catch (err) {
          toast('Không thể dọn dẹp vi phạm', 'error')
        } finally {
          setIsSubmitting(false)
          setConfirmationModal(null)
        }
      }
    })
  }

  const handleDeleteLesson = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa bài học',
      message: 'Bạn có chắc chắn muốn xóa bài học này? Bài tập liên quan cũng sẽ bị ảnh hưởng.',
      onConfirm: async () => {
        try {
          await adminAPI.deleteLesson(id)
          loadLessons()
          loadStatistics()
          toast('Xóa bài học thành công', 'success')
          logAction('Quản lý nội dung', `Đã xóa bài học ID: ${id}`, 'warning')
        } catch (err) {
          toast('Không thể xóa bài học', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleDeleteExercise = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa bài luyện tập',
      message: 'Bạn có chắc chắn muốn xóa bài luyện tập này?',
      onConfirm: async () => {
        try {
          await adminAPI.deleteExercise(id)
          loadExercises()
          loadStatistics()
          toast('Xóa bài luyện tập thành công', 'success')
          logAction('Quản lý nội dung', `Đã xóa bài luyện tập ID: ${id}`, 'warning')
        } catch (err) {
          toast('Không thể xóa bài luyện tập', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleDeleteTest = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa bài kiểm tra',
      message: 'Bạn có chắc chắn muốn xóa bài kiểm tra này?',
      onConfirm: async () => {
        try {
          await adminAPI.deleteTest(id)
          loadTests()
          loadStatistics()
          toast('Xóa bài kiểm tra thành công', 'success')
          logAction('Quản lý nội dung', `Đã xóa bài kiểm tra ID: ${id}`, 'warning')
        } catch (err) {
          toast('Không thể xóa bài kiểm tra', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleDeleteVocabulary = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa từ vựng',
      message: 'Bạn có chắc chắn muốn xóa từ vựng này khỏi kho?',
      onConfirm: async () => {
        try {
          await adminAPI.deleteVocabulary(id)
          loadVocabulary()
          loadStatistics()
          toast('Xóa từ vựng thành công', 'success')
          logAction('Quản lý nội dung', `Đã xóa từ vựng ID: ${id}`, 'warning')
        } catch (err) {
          toast('Không thể xóa từ vựng', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleScanViolation = async (id: number) => {
    try {
      setLoading(true)
      const res = await adminAPI.scanViolation(id)
      const msg = `Độ tin cậy: ${res.data.confidence}% | ${res.data.is_ai_likely ? 'Có khả năng sử dụng AI' : 'Ít khả năng sử dụng AI'}`
      toast(msg, res.data.is_ai_likely ? 'error' : 'success')
    } catch (err) {
      toast('Phân tích AI thất bại', 'error')
    } finally {
      setLoading(false)
    }
  }
  const handleCreateOrUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Chuẩn hóa dữ liệu trước khi gửi
      const payload = {
        ...classFormData,
        // Chuyển teacher_id thành số, nếu rỗng thì là null
        teacher_id: classFormData.teacher_id ? parseInt(classFormData.teacher_id.toString()) : null,
        // Đảm bảo schedule_start/end có giá trị mặc định nếu rỗng
        schedule_start: classFormData.schedule_start || '08:00',
        schedule_end: classFormData.schedule_end || '17:00',
        // Đảm bảo schedule_days là chuỗi JSON
        schedule_days: Array.isArray(classFormData.schedule_days)
          ? JSON.stringify(classFormData.schedule_days)
          : (classFormData.schedule_days || '[]'),
        // Đảm bảo field monitoring là số 0/1
        study_monitoring_enabled: classFormData.study_monitoring_enabled ? 1 : 0,
        test_monitoring_enabled: classFormData.test_monitoring_enabled ? 1 : 0,
        social_monitoring_enabled: classFormData.social_monitoring_enabled ? 1 : 0
      };

      if (selectedClass) {
        await adminAPI.updateClass(selectedClass.id, payload)
        toast('Cập nhật lớp thành công!', 'success')

        // Đồng bộ hóa tức thì cho học sinh trong lớp
        const roomId = `monitoring_${selectedClass.id}`;
        socket?.emit('monitoring-sync', { roomId, type: 'ai', enabled: !!payload.study_monitoring_enabled });
        socket?.emit('monitoring-sync', { roomId, type: 'social', enabled: !!payload.social_monitoring_enabled });
        socket?.emit('monitoring-sync', { roomId, type: 'test', enabled: !!payload.test_monitoring_enabled });
      } else {
        await adminAPI.createClass(payload)
        toast('Tạo lớp thành công!', 'success')
      }

      setShowClassModal(false)
      // Reset form về trạng thái ban đầu
      setClassFormData({ name: '', grade_level: 'thcs_6', teacher_id: user.id })
      setSelectedClass(null)
      loadClasses()
    } catch (error: any) {
      toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClass = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa lớp học',
      message: 'Bạn có chắc chắn muốn xóa lớp học này? Dữ liệu điểm số và vi phạm sẽ được giữ lại nhưng không còn gắn với lớp.',
      onConfirm: async () => {
        try {
          await adminAPI.deleteClass(id)
          toast('Xóa lớp học thành công!', 'success')
          loadClasses()
        } catch (error: any) {
          toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const loadAnnouncements = async () => {
    try {
      const response = await adminAPI.getAnnouncements()
      setAnnouncements(response.data)
    } catch (err) {
      console.error('Failed to load announcements:', err)
    }
  }

  const loadFeedbackList = async () => {
    try {
      const response = await adminAPI.getFeedback()
      setFeedbackList(response.data)
    } catch (err) {
      console.error('Failed to load feedback:', err)
    }
  }

  const handleAnalyzeFeedback = async () => {
    setLoadingAnalysis(true)
    try {
      const response = await adminAPI.analyzeFeedback()
      setAiAnalysisResult(response.data.analysis)
    } catch (err) {
      console.error('AI Analysis failed:', err)
      toast('Phân tích AI thất bại', 'error')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.createAnnouncement(announcementFormData)
      toast('Đã đăng thông báo thành công', 'success')
      setShowAnnouncementModal(false)
      setAnnouncementFormData({
        title: '',
        content: '',
        type: 'info',
        target_role: 'all',
        expires_at: ''
      })
      loadAnnouncements()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Đăng thông báo thất bại', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xóa thông báo',
      message: 'Bạn có chắc chắn muốn xóa thông báo này? Hành động này sẽ gỡ bỏ thông báo khỏi tất cả người dùng.',
      onConfirm: async () => {
        try {
          await adminAPI.deleteAnnouncement(id)
          toast('Đã xóa thông báo', 'success')
          loadAnnouncements()
        } catch (err) {
          toast('Không thể xóa thông báo', 'error')
        }
        setConfirmationModal(null)
      }
    })
  }

  const handleExportData = async (type: 'schools' | 'students' | 'staff') => {
    try {
      const response = await adminAPI.exportData(type)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `export_${type}_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast(`Đã xuất dữ liệu ${type} thành công`, 'success')
    } catch (err) {
      toast('Không thể xuất dữ liệu', 'error')
    }
  }

  const handleImportUsers = async (file: File) => {
    setImportingUsers(true)
    try {
      await adminAPI.importUsers(file)
      toast('Nhập dữ liệu người dùng thành công', 'success')
      loadUsers()
    } catch (err: any) {
      toast(err.response?.data?.error || 'Lỗi khi nhập dữ liệu', 'error')
    } finally {
      setImportingUsers(false)
    }
  }

  const handleViewClassStudents = async (cls: any) => {
    try {
      setLoading(true)
      const res = await adminAPI.getClassStudents(cls.id)
      setClassStudents(res.data.students || [])
      setSelectedClass(cls)
      setShowClassStudentsView(true)
    } catch (err) {
      toast('Không thể tải danh sách học sinh', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isEdit = !!editingItem;
      const formDataToSend = new FormData()

      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          // Flatten array and object for FormData
          if (Array.isArray(formData[key])) {
            formDataToSend.append(key, JSON.stringify(formData[key]))
          } else {
            formDataToSend.append(key, formData[key])
          }
        }
      })

      if (file) {
        formDataToSend.append('file', file)
      }

      if (activeTab === 'lesson') {
        formDataToSend.set('type', 'lessons')
        if (isEdit) {
          await adminAPI.updateLesson(editingItem.id, formDataToSend)
          toast('Cập nhật bài học thành công!', 'success')
        } else {
          await adminAPI.createLesson(formDataToSend)
          toast('Tạo bài học thành công!', 'success')
        }
        loadLessons()
      } else if (activeTab === 'test') {
        const testData: any = {
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          grade_level: formData.grade_level,
          duration: parseInt(formData.duration || '60'),
          max_attempts: parseInt(formData.max_attempts || '0'),
          questions: questionsList.length > 0 ? questionsList : []
        }

        // Scoring is now synchronized in real-time via useEffect and onChange

        if (formData.question && questionsList.length === 0) {
          const validOptions = mcqOptions.filter(opt => opt.trim() !== '')
          testData.questions = [{
            question: formData.question,
            options: validOptions,
            correct_answer: mcqOptions[correctOptionIndex],
            type: formData.type || 'abcd',
            points: 10
          }]
        }

        if (isEdit) {
          await adminAPI.updateTest(editingItem.id, testData)
          toast('Cập nhật bài kiểm tra thành công!', 'success')
        } else {
          await adminAPI.createTest(testData)
          toast('Tạo bài kiểm tra mới thành công!', 'success')
        }
        loadTests()
      } else if (activeTab === 'exercise') {
        // Multi-question exercises
        const exerciseData: any = {
          lesson_id: formData.lesson_id ? parseInt(formData.lesson_id) : null,
          title: formData.title || formData.question, // Fallback to question if title not set
          subject: formData.subject,
          grade_level: formData.grade_level,
          duration: parseInt(formData.duration || '30'),
          max_attempts: parseInt(formData.max_attempts || '0'),
          questions: questionsList.length > 0 ? questionsList : []
        }

        // Scoring is now synchronized in real-time via useEffect and onChange

        if (formData.question && questionsList.length === 0) {
          const validOptions = mcqOptions.filter(opt => opt.trim() !== '')
          exerciseData.questions = [{
            question: formData.question,
            options: validOptions,
            correct_answer: mcqOptions[correctOptionIndex],
            type: formData.type || 'abcd',
            points: 10
          }]
        }

        if (isEdit) {
          await adminAPI.updateExercise(editingItem.id, exerciseData)
          toast('Cập nhật bài tập thành công!', 'success')
        } else {
          await adminAPI.createExercise(exerciseData)
          toast('Tạo bài luyện tập thành công!', 'success')
        }
        loadExercises()
      } else if (activeTab === 'vocabulary') {
        const vocabData = {
          ...formData,
          type: formData.vocab_type || 'speaking'
        }
        if (isEdit) {
          await adminAPI.updateVocabulary(editingItem.id, vocabData)
          toast('Cập nhật từ vựng thành công!', 'success')
        } else {
          formDataToSend.append('type', formData.vocab_type || 'speaking')
          await adminAPI.createVocabulary(formDataToSend)
          toast('Thêm từ vựng thành công!', 'success')
        }
        loadVocabulary()
      } else if (activeTab === 'classes') {
        // Đảm bảo schedule_days luôn là mảng hợp lệ trước khi stringify
        const daysToSend = Array.isArray(formData.schedule_days)
          ? formData.schedule_days
          : (formData.schedule_days ? (() => {
            try {
              return JSON.parse(formData.schedule_days);
            } catch (e) {
              return [];
            }
          })() : []);

        const classData = {
          name: formData.name,
          grade_level: formData.grade_level,
          schedule_start: formData.schedule_start || '08:00',
          schedule_end: formData.schedule_end || '17:00',
          schedule_days: JSON.stringify(daysToSend),
          study_monitoring_enabled: formData.study_monitoring_enabled ? 1 : 0,
          test_monitoring_enabled: formData.test_monitoring_enabled ? 1 : 0,
          social_monitoring_enabled: formData.social_monitoring_enabled ? 1 : 0
        }

        console.log('Sending Class Data:', classData);

        if (isEdit) {
          await adminAPI.updateClass(editingItem.id, classData)
          toast('Cập nhật lớp học thành công!', 'success')

          // Đồng bộ hóa tức thì cho học sinh trong lớp
          const roomId = `monitoring_${editingItem.id}`;
          socket?.emit('monitoring-sync', { roomId, type: 'ai', enabled: !!classData.study_monitoring_enabled });
          socket?.emit('monitoring-sync', { roomId, type: 'social', enabled: !!classData.social_monitoring_enabled });
          socket?.emit('monitoring-sync', { roomId, type: 'test', enabled: !!classData.test_monitoring_enabled });
        } else {
          await adminAPI.createClass(classData)
          toast('Tạo lớp học mới thành công!', 'success')
        }
        loadClasses()
      }

      setFormData({})
      setEditingItem(null)
      setFile(null)
      setMcqOptions(['', '', '', ''])
      setCorrectOptionIndex(0)
      setQuestionsList([])
      setShowCreateModal(false)
      loadStatistics()
    } catch (error: any) {
      toast(error.response?.data?.error || 'Có lỗi xảy ra', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadParticipation = async (itemId?: number, type?: 'test' | 'exercise' | 'vocabulary' | 'violation') => {
    try {
      setLoading(true)
      const currentType = type || resultFilters.type || 'test'
      if (type) setResultFilters({ ...resultFilters, type })

      let response;
      if (currentType === 'vocabulary') {
        if (!itemId) {
          if (selectedResultItem?.id) itemId = selectedResultItem.id;
        }
        if (itemId) {
          response = await (adminAPI as any).getVocabularyParticipation(itemId)
        } else {
          response = { data: [] }
        }
      } else if (currentType === 'violation') {
        const params: any = {}
        if (itemId) {
          // If called from student monitoring, itemId is user_id
          // If called from test/exercise filters, it's item_id
          if (type === 'violation') {
            params.user_id = itemId
          } else {
            params.item_id = itemId
            params.item_type = resultFilters.type === 'test' ? 'test' : 'exercise'
          }
        }
        response = await (adminAPI as any).getViolations(params)
      } else {
        const params: any = { ...resultFilters, type: currentType }
        if (itemId) {
          if (currentType === 'test') params.test_id = itemId
          else params.exercise_id = itemId
        }
        response = await (adminAPI as any).getParticipation(params)
      }

      setParticipationResults(response.data)
      setShowParticipationModal(true)
    } catch (error) {
      console.error('Error loading participation:', error)
      toast('Không thể tải danh sách tham gia', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteParticipation = async (id: number) => {
    const isViolation = resultFilters.type === 'violation'
    setConfirmationModal({
      isOpen: true,
      title: isViolation ? 'Xác nhận xóa vi phạm' : 'Xác nhận xóa lượt làm bài',
      message: isViolation
        ? 'Bạn có chắc chắn muốn xóa bản ghi vi phạm này? Bằng chứng sẽ bị xóa vĩnh viễn.'
        : 'Bạn có chắc chắn muốn xóa bản ghi tham gia này? Hành động này sẽ xóa vĩnh viễn kết quả của học sinh.',
      onConfirm: async () => {
        try {
          setLoading(true)
          if (isViolation) {
            await adminAPI.deleteViolation(id)
          } else {
            await (adminAPI as any).deleteParticipation(resultFilters.type, id)
          }
          toast(isViolation ? 'Xóa vi phạm thành công' : 'Xóa lượt làm bài thành công', 'success')
          // Refresh the list
          await handleLoadParticipation(selectedResultItem?.id, resultFilters.type)
        } catch (error) {
          console.error('Error deleting:', error)
          toast(isViolation ? 'Không thể xóa vi phạm' : 'Không thể xóa lượt làm bài', 'error')
        } finally {
          setLoading(false)
          setConfirmationModal(null)
        }
      }
    })
  }

  const handleViewSubmission = (submission: any) => {
    setSelectedSubmission(submission)
    setManualScore(submission.score || submission.points || 0)
  }

  const handleSaveParticipationGrade = async () => {
    if (!selectedSubmission) return
    try {
      setLoading(true)
      await (adminAPI as any).gradeParticipation({
        type: resultFilters.type,
        id: selectedSubmission.id,
        score: manualScore
      })
      toast('Đã cập nhật điểm số', 'success')
      logAction('Chấm điểm', `Đã cập nhật điểm cho ${selectedSubmission.full_name}`, 'success')
      // Refresh the list
      await handleLoadParticipation(selectedResultItem?.id, resultFilters.type)
      setSelectedSubmission(null)
    } catch (error) {
      console.error('Error saving grade:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleView = (item: any, type: string) => {
    setActiveTab(type as any)
    setEditingItem(item)

    // Pre-fill form data based on type
    if (type === 'vocabulary') {
      setFormData({
        word: item.word,
        meaning: item.meaning,
        pronunciation: item.pronunciation || item.phonetic || '',
        vocab_type: item.type,
        grade_level: item.grade_level,
        subject: item.subject,
        example: item.example
      })
        // Fetch participation data
        ; (adminAPI as any).getVocabularyParticipation(item.id).then((res: any) => {
          setVocabParticipation(res.data)
        }).catch((err: any) => console.error('Failed to load vocab participation', err))
    } else if (type === 'lesson') {
      setFormData({
        title: item.title,
        content: item.content,
        subject: item.subject,
        grade_level: item.grade_level,
        file_path: item.file_path,
        file_type: item.file_type,
        material_type: item.material_type || '',
        material_link: item.material_link || ''
      })
    } else if (type === 'test') {
      setFormData({
        title: item.title,
        description: item.description,
        subject: item.subject,
        grade_level: item.grade_level,
        duration: item.duration?.toString() || '60',
        max_attempts: item.max_attempts || 0,
        total_score: item.total_points?.toString() || ''
      })
      if (item.questions) {
        setQuestionsList(item.questions.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || [])
        })))
      }
    } else if (type === 'exercise') {
      setFormData({
        lesson_id: item.lesson_id?.toString() || '',
        title: item.title || '',
        subject: item.subject || '',
        grade_level: item.grade_level || '',
        duration: item.duration?.toString() || '30',
        max_attempts: item.max_attempts || 0,
        total_score: item.total_points?.toString() || ''
      })
      if (item.questions) {
        setQuestionsList(item.questions.map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || [])
        })))
      }
    } else if (type === 'classes') {
      setFormData({
        name: item.name,
        grade_level: item.grade_level,
        schedule_start: item.schedule_start,
        schedule_end: item.schedule_end,
        schedule_days: typeof item.schedule_days === 'string' ? JSON.parse(item.schedule_days) : (item.schedule_days || []),
        study_monitoring_enabled: item.study_monitoring_enabled || 0,
        test_monitoring_enabled: item.test_monitoring_enabled || 0,
        social_monitoring_enabled: item.social_monitoring_enabled || 0
      })
    }

    setShowCreateModal(true)
  }

  const handleAiSelectType = (type: string) => {
    setFormData({ ...formData, ai_type: type })
    setAiChatStep(1)
    setAiChatMessages(prev => [
      ...prev,
      { role: 'user', content: `Tôi muốn ${type === 'lesson' ? 'tạo bài giảng' : type === 'exercise' ? 'tạo bài tập' : 'tạo bài kiểm tra'}` },
      { role: 'ai', content: `Thầy cô đã chọn ${type === 'lesson' ? 'Tạo bài giảng' : type === 'exercise' ? 'Tạo bài tập' : 'Tạo bài kiểm tra'}. Vui lòng tải tệp đính kèm (PDF, Word, TXT, PPT) hoặc nhập yêu cầu chi tiết để em bắt đầu soạn thảo nhé.` }
    ])
  }

  const handleAiSubmitPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!file && !formData.prompt_addon) {
      toast('Vui lòng chọn tệp hoặc nhập yêu cầu', 'info')
      return
    }

    // OPTIMISTIC UPDATE: Clear input and show message immediately
    const currentFile = file
    const currentPrompt = formData.prompt_addon || 'Đã đính kèm tệp dữ liệu nguồn'

    setAiChatMessages(prev => [
      ...prev,
      { role: 'user', content: currentPrompt, hasFile: !!currentFile }
    ])

    // Clear inputs immediately
    setFormData((prev: any) => ({ ...prev, prompt_addon: '' }))
    setFile(null)

    setAiLoading(true)
    setIsAITyping(true)
    try {
      const gData = new FormData()
      if (currentFile) gData.append('file', currentFile)
      gData.append('type', formData.ai_type || 'lesson')
      gData.append('prompt_addon', currentPrompt)

      const response = await adminAPI.aiGenerate(gData)
      setAiGeneratedContent(response.data)
      setAiPreviewData(response.data)

      setAiChatMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: 'Em đã hoàn thành việc biên soạn nội dung! Thầy cô có thể xem trước và chỉnh sửa nội dung bên dưới trước khi lưu vào hệ thống nhé.',
          type: 'preview'
        }
      ])
      setAiChatStep(2)
    } catch (error) {
      toast('Phân tích AI thất bại', 'error')
      setAiChatMessages(prev => [...prev, { role: 'ai', content: 'Có lỗi xảy ra trong quá trình tạo nội dung. Thầy cô vui lòng thử lại hoặc thay đổi tệp nguồn nhé.' }])
    } finally {
      setAiLoading(false)
      setIsAITyping(false)
    }
  }

  const handleAiConfirm = () => {
    setShowMetadataForm(true)
    setAiChatMessages(prev => [...prev, { role: 'ai', content: 'Thầy cô hãy điền thêm thông tin tiêu đề và phân loại để em lưu bài vào hệ thống nhé!' }])
  }

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    handleAiSubmitPrompt()
  }

  const handleSaveAiContent = async (saveType: 'lesson' | 'test' | 'exercise') => {
    if (!aiGeneratedContent) return
    setLoading(true)
    try {
      if (saveType === 'test') {
        const payload: any = {
          title: formData.title || aiGeneratedContent.title || 'Bài kiểm tra AI',
          description: formData.description || aiGeneratedContent.description,
          duration: parseInt(formData.duration || '45'),
          max_attempts: parseInt(formData.max_attempts || '0'),
          questions: aiGeneratedContent.questions || (Array.isArray(aiGeneratedContent) ? aiGeneratedContent : []),
          subject: formData.subject || 'anh',
          grade_level: formData.grade_level || 'thcs_6'
        };

        if (formData.total_score && payload.questions && payload.questions.length > 0) {
          const pointsPerQ = Math.round((parseFloat(formData.total_score) / payload.questions.length) * 100) / 100;
          payload.questions = payload.questions.map((q: any) => ({ ...q, points: pointsPerQ }));
        }

        await adminAPI.createTest(payload)
        toast('Đã lưu nội dung AI thành bài kiểm tra!', 'success')
      } else if (saveType === 'lesson') {
        const formDataToSend = new FormData()
        formDataToSend.append('title', formData.title || aiGeneratedContent.title || 'Bài giảng AI')
        formDataToSend.append('content', aiGeneratedContent.content || JSON.stringify(aiGeneratedContent))
        formDataToSend.append('subject', formData.subject || 'anh')
        formDataToSend.append('grade_level', formData.grade_level || 'thcs_6')
        await adminAPI.createLesson(formDataToSend)
        toast('Đã lưu nội dung AI thành bài giảng!', 'success')
      } else if (saveType === 'exercise') {
        await adminAPI.createExercise({
          title: formData.title || aiGeneratedContent.title || 'Bài tập AI',
          description: formData.description,
          questions: aiGeneratedContent.questions || (Array.isArray(aiGeneratedContent) ? aiGeneratedContent : []),
          subject: formData.subject || 'anh',
          grade_level: formData.grade_level || 'thcs_6'
        })
        toast('Đã lưu nội dung AI thành bài tập!', 'success')
      }

      logAction('Soạn thảo AI', `Đã tạo nội dung mới: ${formData.title || aiGeneratedContent.title}`, 'success')
      setAiChatStep(0)
      setShowMetadataForm(false)
      setAiChatMessages([{ role: 'ai', content: 'Chào mừng quý thầy cô! Em là trợ lý AI. Thầy cô muốn em hỗ trợ tạo nội dung gì hôm nay ạ?', type: 'greet' }])
      setAiGeneratedContent(null)
    } catch (error: any) {
      toast('Lỗi khi lưu nội dung: ' + (error.response?.data?.error || 'Lỗi không xác định'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleProctoring = async (enabled: boolean) => {
    console.log('Toggling Proctoring to:', enabled);
    try {
      await adminAPI.toggleProctoring(enabled)
      setIsGlobalProctoring(enabled)
      toast(`Đã ${enabled ? 'bật' : 'tắt'} giám sát AI`, 'success')
      logAction('Giám sát', `${enabled ? 'Bật' : 'Tắt'} giám sát AI toàn hệ thống`, 'info')
    } catch (error: any) {
      console.error('Error toggling proctoring:', error)
      const errorMsg = error.response?.data?.error || 'Không thể cập nhật cài đặt'
      toast(errorMsg, 'error')
    }
  }

  const handleToggleSocialMonitoring = async (enabled: boolean) => {
    console.log('Toggling Social Monitoring to:', enabled);
    try {
      await adminAPI.toggleSocialMonitoring(enabled)
      setIsGlobalSocialMonitoring(enabled)
      toast(`Đã ${enabled ? 'bật' : 'tắt'} giám sát mạng xã hội`, 'success')
      logAction('Giám sát', `${enabled ? 'Bật' : 'Tắt'} giám sát MXH toàn hệ thống`, 'info')
    } catch (error: any) {
      console.error('Error toggling social monitoring:', error)
      const errorMsg = error.response?.data?.error || 'Không thể cập nhật cài đặt'
      toast(errorMsg, 'error')
    }
  }

  const handleToggleTestMonitoring = async (enabled: boolean) => {
    console.log('Toggling Test Monitoring to:', enabled);
    try {
      await adminAPI.toggleTestMonitoring(enabled)
      setIsGlobalTestMonitoring(enabled)
      toast(`Đã ${enabled ? 'bật' : 'tắt'} giám sát kiểm tra`, 'success')
      logAction('Giám sát', `${enabled ? 'Bật' : 'Tắt'} giám sát phòng thi toàn hệ thống`, 'info')
    } catch (error: any) {
      console.error('Error toggling test monitoring:', error)
      const errorMsg = error.response?.data?.error || 'Không thể cập nhật cài đặt'
      toast(errorMsg, 'error')
    }
  }

  const handleToggleTeacherAccess = async (teacherId: number, isFullAccess: boolean) => {
    try {
      await adminAPI.toggleTeacherAccess(teacherId, isFullAccess)
      loadUsers()
      toast('Quyền hạn giáo viên đã được cập nhật', 'success')
    } catch (error) {
      console.error('Error toggling teacher access:', error)
      toast('Không thể cập nhật quyền hạn', 'error')
    }
  }

  const handleSystemCleanup = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Xác nhận Dọn dẹp & Sửa lỗi',
      message: (
        <div className="space-y-4">
          <p>Hành động này sẽ quét và xóa các bài tập bị lỗi hoặc không hợp lệ. <b>Đồng thời, hệ thống sẽ tự động dọn dẹp các ảnh bằng chứng vi phạm cũ (&gt; 7 ngày) và các tệp rác để tiết kiệm bộ nhớ.</b></p>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs">

          </div>
          <p>Bạn có chắc chắn muốn tiếp tục?</p>
        </div>
      ),
      onConfirm: async () => {
        setIsSubmitting(true)
        try {
          const res = await adminAPI.performCleanup()
          const report = res.data.report
          toast(`Dọn dẹp thành công! Đã xóa: ${report.orphaned_exercises} bài tập, ${report.orphaned_questions} câu hỏi, ${report.orphaned_progress} tiến độ mồ côi.`, 'success')
          logAction('Quản lý nội dung', 'Đã thực hiện dọn dẹp và sửa lỗi bài tập', 'info')
          loadExercises() // Reload exercises to reflect changes
        } catch (error: any) {
          toast(error.response?.data?.error || 'Có lỗi xảy ra khi dọn dẹp hệ thống', 'error')
        } finally {
          setIsSubmitting(false)
          setConfirmationModal(null)
        }
      }
    })
  }


  const loadClassGrades = async (classId: number, filters?: any) => {
    setLoading(true)
    try {
      const res = await gradesAPI.getClassGrades(classId, filters || gradeFilters)
      setClassGrades(res.data)
    } catch (error: any) {
      toast(error.response?.data?.error || 'Lỗi khi tải điểm số', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadClassStudentsForGrades = async (classId: number) => {
    try {
      const res = await gradesAPI.getClassStudents(classId)
      setGradeClassStudents(res.data.students)
      setSelectedClassForGrades(res.data.class)
    } catch (error: any) {
      toast(error.response?.data?.error || 'Lỗi khi tải danh sách học sinh', 'error')
    }
  }

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassForGrades) return

    setIsSubmitting(true)
    try {
      if (currentGradeForm.id) {
        await gradesAPI.updateGrade(currentGradeForm.id, {
          score: currentGradeForm.score,
          note: currentGradeForm.note,
          semester: currentGradeForm.semester || gradeFilters.semester,
          year: currentGradeForm.year || gradeFilters.year
        })
        toast('Cập nhật điểm thành công!', 'success')
      } else {
        await gradesAPI.createGrade({
          ...currentGradeForm,
          class_id: selectedClassForGrades.id,
          subject: gradeFilters.subject,
          semester: currentGradeForm.semester || gradeFilters.semester,
          year: currentGradeForm.year || gradeFilters.year
        })
        toast('Nhập điểm thành công!', 'success')
      }
      setIsGradeModalOpen(false)
      loadClassGrades(selectedClassForGrades.id)
    } catch (error: any) {
      toast(error.response?.data?.error || 'Lỗi khi lưu điểm số', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteGrade = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa điểm này?')) return
    try {
      await gradesAPI.deleteGrade(id)
      toast('Đã xóa điểm thành công', 'success')
      if (selectedClassForGrades) {
        loadClassGrades(selectedClassForGrades.id)
      }
    } catch (error: any) {
      toast(error.response?.data?.error || 'Lỗi khi xóa điểm', 'error')
    }
  }

  const logAction = async (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    try {
      await api.post('/notifications', { title, message, type })
    } catch (err) {
      console.error('Failed to log notification:', err)
    }
  }


  const MENU_GROUPS = [
    {
      title: 'Tổng quan',
      items: [
        { id: 'statistics', label: 'Thống kê', icon: BarChart3 },
        { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
        { id: 'announcements', label: 'Thông báo', icon: Bell },
        { id: 'activity-logs', label: 'Nhật ký', icon: ListChecks },
      ]
    },
    {
      title: 'Nội dung học tập',
      items: [
        { id: 'lesson', label: 'Bài giảng', icon: BookOpen },
        { id: 'exercise', label: 'Luyện tập', icon: Target },
        { id: 'test', label: 'Bài kiểm tra', icon: FileText },
        { id: 'vocabulary', label: 'Từ vựng', icon: Book },
        { id: 'ai-generate', label: 'Soạn bài AI', icon: Sparkles },
      ]
    },
    {
      title: 'Giám sát & Quản lý',
      items: [
        { id: 'violations', label: 'Giám sát AI', icon: ShieldAlert },
        { id: 'grades', label: 'Quản lý điểm', icon: GraduationCap },
        { id: 'classes', label: 'Lớp học', icon: SchoolIcon },
        { id: 'students', label: 'Học sinh', icon: Users },
        { id: 'staff', label: 'Cán bộ', icon: Briefcase },
        { id: 'data-management', label: 'Dữ liệu', icon: FileUp },
        { id: 'feedback', label: 'Phản hồi', icon: MessageSquare, superAdminOnly: true },
      ]
    }
  ].map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Show staff and activity logs to all admins
      if (item.id === 'staff' && user?.role !== 'admin' && user?.is_super_admin !== 1) return false;
      if (item.id === 'activity-logs' && user?.role !== 'admin' && user?.is_super_admin !== 1) return false;
      if (item.superAdminOnly && user?.is_super_admin !== 1) return false;
      return true;
    })
  })).filter(group => group.items.length > 0);


  const filteredUsers = useMemo(() => {
    const filtered = allUsers.filter(u => {
      const matchesGrade = !gradeFilter || u.grade_level === gradeFilter
      const matchesSearch = !searchQuery ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

      if (activeTab === 'staff') {
        const matchesSpec = !staffSpecializationFilter || u.specialty === staffSpecializationFilter
        return (u.role === 'admin' || u.role === 'teacher') && matchesSearch && matchesSpec
      }
      // students tab
      const matchesClass = !classNameFilter || (u.class_name && u.class_name.toUpperCase() === classNameFilter.toUpperCase())
      return u.role === 'student' && matchesGrade && matchesSearch && matchesClass
    })

    if (activeTab === 'students') {
      return [...filtered].sort((a, b) => (b.points || 0) - (a.points || 0))
    }
    return filtered
  }, [allUsers, gradeFilter, searchQuery, activeTab, staffSpecializationFilter, classNameFilter]);

  // Count students per grade
  const gradeStats = useMemo(() => {
    return allUsers.filter(u => u.role === 'student').reduce((acc: any, curr: any) => {
      acc[curr.grade_level] = (acc[curr.grade_level] || 0) + 1
      return acc
    }, {})
  }, [allUsers]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Hệ thống đang khởi tạo..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans transition-colors duration-300">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="bg-card border-r border-border fixed h-full z-20 hidden md:block"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-xl font-bold tracking-tight">
              EDU<span className="text-blue-400">SMART</span>
            </span>
          )}
        </div>

        <nav className="mt-8 px-4 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
          {MENU_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {sidebarOpen && (
                <h3 className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-2">
                  {group.title}
                </h3>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all group ${activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    } ${!sidebarOpen && 'justify-center'}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-muted-foreground group-hover:text-blue-500'} ${sidebarOpen && 'mr-3'}`} />
                  {sidebarOpen && <span className="text-sm font-bold">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center p-3.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className={`w-5 h-5 flex-shrink-0 ${sidebarOpen && 'mr-3'}`} />
            {sidebarOpen && <span className="text-sm font-medium">Đăng xuất</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-[280px]' : 'md:ml-[80px]'}`}>
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent rounded-lg transition-colors md:block hidden"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Chào mừng, {user.full_name || user.username}
              </h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hệ thống quản lý giáo dục thông minh</p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <ThemeToggle />
            <div className="h-10 w-[1px] bg-border mx-2"></div>
            <NotificationBell />
            <div className="h-10 w-[1px] bg-border"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <Link href="/profile" className="text-sm font-bold text-foreground leading-tight hover:text-blue-600 transition-colors uppercase tracking-tight">{user.full_name || user.username}</Link>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{user.role}</p>
              </div>
              <Link href="/profile" className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg hover:scale-110 transition-transform bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                {user?.avatar_url ? (
                  <img
                    src={`${API_URL}${user.avatar_url}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.username?.charAt(0).toUpperCase()
                )}
              </Link>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'ai-generate' && (
                <div className="max-w-5xl mx-auto space-y-6">
                  {/* Chat interface */}
                  <div className="bg-card rounded-3xl shadow-xl border border-border flex flex-col min-h-[600px] max-h-[85vh] overflow-hidden">
                    <div className="p-6 border-b border-border bg-gradient-to-r from-blue-600/10 to-purple-600/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">Trợ lý Biên soạn AI</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            {isAITyping ? (
                              <span className="flex items-center gap-1">
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></span>
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                Đang suy nghĩ...
                              </span>
                            ) : 'Sẵn sàng hỗ trợ'}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => {
                        setAiChatMessages([{ role: 'ai', content: 'Chào mừng quý thầy cô! Em là trợ lý AI. Thầy cô muốn em hỗ trợ tạo nội dung gì hôm nay ạ?', type: 'greet' }])
                        setAiChatStep(0)
                        setAiGeneratedContent(null)
                      }} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
                        <TrendingUp className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                      {aiChatMessages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'ai'
                            ? 'bg-muted text-foreground rounded-tl-none border border-border'
                            : 'bg-blue-600 text-white rounded-tr-none shadow-lg'
                            }`}>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                            {msg.type === 'greet' && (
                              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button onClick={() => handleAiSelectType('lesson')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800 flex items-center gap-2 justify-center">
                                  <BookOpen className="w-4 h-4" /> Bài giảng
                                </button>
                                <button onClick={() => handleAiSelectType('exercise')} className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200 dark:border-purple-800 flex items-center gap-2 justify-center">
                                  <Target className="w-4 h-4" /> Bài tập
                                </button>
                                <button onClick={() => handleAiSelectType('test')} className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 justify-center">
                                  <FileText className="w-4 h-4" /> Kiểm tra
                                </button>
                              </div>
                            )}

                            {msg.type === 'preview' && aiGeneratedContent && (
                              <div className="mt-4 space-y-4">
                                {/* Structured Preview */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold flex items-center gap-2 uppercase text-blue-600">
                                      {aiGeneratedContent.questions || Array.isArray(aiGeneratedContent) ? <ListChecks className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                      {aiGeneratedContent.questions || Array.isArray(aiGeneratedContent) ? `DANH SÁCH CÂU HỎI (${(aiGeneratedContent.questions || aiGeneratedContent).length})` : 'NỘI DUNG BÀI GIẢNG'}
                                    </h5>
                                    <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-200 flex items-center gap-1">
                                      <Plus className="w-3 h-3" /> THÊM NỘI DUNG
                                    </button>
                                  </div>

                                  <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                                    {/* Render Questions */}
                                    {(aiGeneratedContent.questions || Array.isArray(aiGeneratedContent)) ? (
                                      (aiGeneratedContent.questions || aiGeneratedContent).map((q: any, i: number) => (
                                        <div key={i} className="p-4 bg-background border border-border rounded-xl shadow-sm space-y-3 group hover:border-blue-300 transition-all">
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                              {i + 1}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded uppercase text-muted-foreground">TRẮC NGHIỆM</span>
                                                <button className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                              <p className="text-sm font-medium text-foreground">{q.question}</p>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-11">
                                            {q.options?.map((opt: string, idx: number) => {
                                              const isCorrect = opt.startsWith(q.correct_answer) || opt === q.correct_answer;
                                              const label = String.fromCharCode(65 + idx);
                                              return (
                                                <div key={idx} className={`p-2 rounded-lg text-sm border flex items-center gap-3 ${isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-muted/50 border-transparent'}`}>
                                                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-muted-foreground'}`}>{label}</span>
                                                  <span className={isCorrect ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>{opt}</span>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      // Render Lesson/Content
                                      <div className="prose dark:prose-invert prose-sm max-w-none p-4 bg-background border border-border rounded-xl">
                                        <div dangerouslySetInnerHTML={{ __html: aiGeneratedContent.content?.replace(/\n/g, '<br/>') || '' }} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button onClick={handleAiConfirm} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                    <CheckCircle2 className="w-5 h-5" /> CHỐT NỘI DUNG
                                  </button>
                                  <button onClick={() => setAiChatStep(1)} className="px-5 py-3 bg-muted text-muted-foreground hover:text-foreground rounded-xl font-bold hover:bg-accent transition-colors">
                                    SỬA LẠI
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isAITyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted p-4 rounded-2xl rounded-tl-none border border-border">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6 border-t border-border bg-card">
                      {aiChatStep === 1 && (
                        <div className="space-y-4">
                          {file && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 flex items-center gap-3 w-fit max-w-full shadow-sm"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                                {file.name.endsWith('.pdf') ? <FileText className="w-4 h-4" /> :
                                  file.name.match(/\.(ppt|pptx)$/) ? <TrendingUp className="w-4 h-4" /> :
                                    <Book className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-foreground truncate max-w-[200px]">{file.name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase font-black">{(file.size / 1024).toFixed(0)} KB • FILE SẴN SÀNG</p>
                              </div>
                              <button onClick={() => setFile(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </motion.div>
                          )}
                          <form onSubmit={handleAiSubmitPrompt} className="relative flex items-end gap-2 bg-muted border border-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <label className="p-3 cursor-pointer hover:bg-accent rounded-xl text-blue-600 transition-colors shrink-0 group relative">
                              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                              <input
                                type="file"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                className="hidden"
                                accept=".pdf,.txt,.doc,.docx,.ppt,.pptx"
                              />
                            </label>
                            <textarea
                              value={formData.prompt_addon || ''}
                              onChange={(e) => setFormData({ ...formData, prompt_addon: e.target.value })}
                              placeholder="Nhập yêu cầu soạn bài hoặc tải tài liệu đính kèm..."
                              className="flex-1 bg-transparent p-2 outline-none text-sm min-h-[44px] max-h-[200px] resize-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAiSubmitPrompt(e as any);
                                }
                              }}
                            />
                            <button
                              type="submit"
                              disabled={aiLoading || (!file && !formData.prompt_addon)}
                              className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shrink-0"
                            >
                              {aiLoading ? <LoadingSpinner size="sm" text="" noContainer /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                          </form>
                        </div>
                      )}

                      {aiChatStep === 0 && (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground font-medium">Vui lòng chọn loại nội dung ở trên để tiếp tục</p>
                        </div>
                      )}

                      {aiChatStep === 2 && !showMetadataForm && (
                        <div className="flex gap-4">
                          <button onClick={() => setAiChatStep(1)} className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-accent transition-all flex items-center justify-center gap-2">
                            <SwitchCamera className="w-5 h-5" /> SOẠN LẠI TỪ ĐẦU
                          </button>
                          <button onClick={handleAiConfirm} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                            <CheckCircle2 className="w-5 h-5" /> CHỐT NỘI DUNG
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Input Form (Modal-like card) */}
                  <AnimatePresence>
                    {showMetadataForm && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card p-8 rounded-3xl border border-blue-200 dark:border-blue-900 shadow-2xl relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Target className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                          <h4 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Settings className="w-6 h-6 text-blue-600" />
                            Thông tin định danh nội dung
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2 col-span-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tiêu đề nội dung</label>
                              <input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                                placeholder={aiGeneratedContent?.title || `Nhập tiêu đề ${formData.ai_type === 'lesson' ? 'bài giảng' : 'bài kiểm tra'}...`}
                              />
                            </div>

                            {(formData.ai_type === 'test' || formData.ai_type === 'exercise') && (
                              <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mô tả bài kiểm tra</label>
                                <textarea
                                  value={formData.description || ''}
                                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                  className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                  placeholder={aiGeneratedContent?.description || "Mô tả ngắn về bài kiểm tra..."}
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Khối lớp</label>
                              <select
                                value={formData.grade_level}
                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Chọn khối lớp</option>
                                <option value="thcs_6">Lớp 6</option>
                                <option value="thcs_7">Lớp 7</option>
                                <option value="thcs_8">Lớp 8</option>
                                <option value="thcs_9">Lớp 9</option>
                                <option value="thpt_10">Lớp 10</option>
                                <option value="thpt_11">Lớp 11</option>
                                <option value="thpt_12">Lớp 12</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Môn học</label>
                              <select
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Chọn môn học</option>
                                <option value="toan">Toán học</option>
                                <option value="van">Ngữ văn</option>
                                <option value="anh">Tiếng Anh</option>
                                <option value="ly">Vật lý</option>
                                <option value="hoa">Hóa học</option>
                                <option value="sinh">Sinh học</option>
                                <option value="su">Lịch sử</option>
                                <option value="dia">Địa lý</option>
                                <option value="gdcd">GDCD</option>
                                <option value="tin">Tin học</option>
                                <option value="congnghe">Công nghệ</option>
                              </select>
                            </div>

                            {(formData.ai_type === 'test' || formData.ai_type === 'exercise') && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Thời gian làm bài (Phút)</label>
                                  <input
                                    type="number"
                                    value={formData.duration || 45}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Giới hạn lượt làm (0 = Không GH)</label>
                                  <input
                                    type="number"
                                    value={formData.max_attempts || 0}
                                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                                    className="w-full bg-muted border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 font-bold"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex gap-4">
                            <button onClick={() => setShowMetadataForm(false)} className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold hover:bg-accent transition-colors">QUAY LẠI</button>
                            <button onClick={() => handleSaveAiContent(formData.ai_type || 'lesson')} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                              <Upload className="w-5 h-5" /> HOÀN TẤT & LƯU LÊN HỆ THỐNG
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === 'classes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div>
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <SchoolIcon className="w-6 h-6 text-blue-600" />
                        Quản lý Lớp học chính thức
                      </h3>
                      <p className="text-sm text-muted-foreground">Tạo và quản lý danh sách lớp học, phân bộ giáo viên và theo dõi sĩ số</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedClass(null)
                        setClassFormData({ name: '', grade_level: 'thcs_6', teacher_id: user.id })
                        setShowClassModal(true)
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      <Plus className="w-5 h-5" /> THÊM LỚP MỚI
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {classes.map((cls) => (
                      <motion.div
                        key={cls.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card rounded-[2rem] border border-border p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Target className="w-24 h-24" />
                        </div>

                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-black text-xl">
                            {cls.name.charAt(0)}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedClass(cls)
                                setClassFormData({
                                  name: cls.name,
                                  grade_level: cls.grade_level,
                                  teacher_id: cls.teacher_id,
                                  study_monitoring_enabled: !!cls.study_monitoring_enabled,
                                  test_monitoring_enabled: !!cls.test_monitoring_enabled,
                                  social_monitoring_enabled: !!cls.social_monitoring_enabled,
                                  schedule_start: cls.schedule_start,
                                  schedule_end: cls.schedule_end,
                                  schedule_days: cls.schedule_days ? (typeof cls.schedule_days === 'string' ? JSON.parse(cls.schedule_days) : cls.schedule_days) : []
                                })
                                setShowClassModal(true)
                              }}
                              className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls.id)}
                              className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-xl transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 mb-6 relative z-10">
                          <h4 className="text-xl font-black text-foreground uppercase tracking-tight">{cls.name}</h4>
                          <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black tracking-widest uppercase">
                            {cls.grade_level?.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-border relative z-10 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Sĩ số:</span>
                            <span className="font-black text-blue-600 text-lg">{cls.student_count || 0}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-medium">Chủ nhiệm:</span>
                            <span className="font-bold text-foreground line-clamp-1">{cls.teacher_name || 'Hệ thống'}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleViewClassStudents(cls)}
                          className="w-full mt-6 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4" /> XEM HỌC SINH
                        </button>
                      </motion.div>
                    ))}

                    {classes.length === 0 && (
                      <div className="col-span-full py-20 bg-muted/30 rounded-[3rem] border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                        <SchoolIcon className="w-16 h-16 opacity-20 mb-4" />
                        <p className="font-bold uppercase tracking-widest">Chưa có lớp học nào</p>
                        <p className="text-sm">Vui lòng thêm lớp mới để bắt đầu quản lý</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'grades' && (
                <div className="space-y-6">
                  {!selectedClassForGrades ? (
                    <>
                      <div className="flex items-center justify-between bg-card p-6 rounded-3xl border border-border shadow-sm">
                        <div>
                          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-blue-600" />
                            Quản lý Điểm số
                          </h3>
                          <p className="text-sm text-muted-foreground">Chọn một lớp học để bắt đầu nhập và quản lý điểm số</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {classes.map((cls) => (
                          <motion.div
                            key={cls.id}
                            layout
                            className="bg-card rounded-[2rem] border border-border p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                          >
                            <div className="space-y-1 mb-6 relative z-10">
                              <h4 className="text-xl font-black text-foreground uppercase tracking-tight">{cls.name}</h4>
                              <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[10px] font-black tracking-widest uppercase">
                                {cls.grade_level?.replace('_', ' ')}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedClassForGrades(cls)
                                loadClassGrades(cls.id)
                              }}
                              className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Pencil className="w-4 h-4" /> NHẬP ĐIỂM
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between bg-card p-6 rounded-3xl border border-border shadow-sm">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setSelectedClassForGrades(null)}
                            className="p-2 hover:bg-muted rounded-xl text-muted-foreground"
                          >
                            <ChevronRight className="w-6 h-6 rotate-180 text-blue-600" />
                          </button>
                          <div>
                            <h3 className="text-xl font-bold text-foreground">
                              Quản lý điểm lớp {selectedClassForGrades.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">Học kỳ {gradeFilters.semester} • Year {gradeFilters.year}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <select
                            className="px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={gradeFilters.subject}
                            onChange={(e) => {
                              const newFilters = { ...gradeFilters, subject: e.target.value }
                              setGradeFilters(newFilters)
                              if (selectedClassForGrades) {
                                loadClassGrades(selectedClassForGrades.id, newFilters)
                              }
                            }}
                          >
                            <option value="anh">Tiếng Anh</option>
                            <option value="toan">Toán học</option>
                            <option value="van">Ngữ văn</option>
                            <option value="ly">Vật lý</option>
                            <option value="hoa">Hóa học</option>
                          </select>

                          <select
                            className="px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={gradeFilters.semester}
                            onChange={(e) => {
                              const newFilters = { ...gradeFilters, semester: parseInt(e.target.value) }
                              setGradeFilters(newFilters)
                              if (selectedClassForGrades) {
                                loadClassGrades(selectedClassForGrades.id, newFilters)
                              }
                            }}
                          >
                            <option value={1}>Học kỳ I</option>
                            <option value={2}>Học kỳ II</option>
                          </select>

                          <input
                            type="text"
                            placeholder="Year (VD: 2025-2026)"
                            className="w-32 px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={gradeFilters.year}
                            onChange={(e) => {
                              const newFilters = { ...gradeFilters, year: e.target.value }
                              setGradeFilters(newFilters)
                            }}
                            onBlur={() => {
                              if (selectedClassForGrades) {
                                loadClassGrades(selectedClassForGrades.id)
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              setCurrentGradeForm({
                                student_id: gradeClassStudents[0]?.id || 0,
                                score: 0,
                                grade_type: 'quiz_15',
                                note: '',
                                semester: gradeFilters.semester,
                                year: gradeFilters.year
                              })
                              setIsGradeModalOpen(true)
                            }}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                          >
                            <Plus className="w-4 h-4" /> NHẬP ĐIỂM
                          </button>
                        </div>
                      </div>

                      <div className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-muted text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">
                            <tr>
                              <th className="px-6 py-5">Học sinh</th>
                              <th className="px-6 py-5">Kiểm tra miệng</th>
                              <th className="px-6 py-5">15 Phút</th>
                              <th className="px-6 py-5">45 Phút / Giữa kỳ</th>
                              <th className="px-6 py-5">Cuối kỳ</th>
                              <th className="px-6 py-5 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {gradeClassStudents.map((student) => {
                              const studentGrades = classGrades.filter(g => g.student_id === student.id)
                              return (
                                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-5">
                                    <div className="font-extrabold text-sm">{student.full_name}</div>
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">@{student.username}</div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2">
                                      {studentGrades.filter(g => g.grade_type === 'oral').map(g => (
                                        <span key={g.id} onClick={() => { setCurrentGradeForm(g); setIsGradeModalOpen(true); }} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black border border-blue-100/50 cursor-pointer hover:bg-blue-100 transition-colors">{g.score}</span>
                                      ))}
                                      {studentGrades.filter(g => g.grade_type === 'oral').length === 0 && <span className="text-xs text-muted-foreground italic opacity-50">---</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2">
                                      {studentGrades.filter(g => g.grade_type === 'quiz_15').map(g => (
                                        <span key={g.id} onClick={() => { setCurrentGradeForm(g); setIsGradeModalOpen(true); }} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black border border-emerald-100/50 cursor-pointer hover:bg-emerald-100 transition-colors">{g.score}</span>
                                      ))}
                                      {studentGrades.filter(g => g.grade_type === 'quiz_15').length === 0 && <span className="text-xs text-muted-foreground italic opacity-50">---</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2">
                                      {studentGrades.filter(g => g.grade_type === 'test_45' || g.grade_type === 'midterm').map(g => (
                                        <span key={g.id} onClick={() => { setCurrentGradeForm(g); setIsGradeModalOpen(true); }} className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black border border-amber-100/50 cursor-pointer hover:bg-amber-100 transition-colors">{g.score}</span>
                                      ))}
                                      {studentGrades.filter(g => g.grade_type === 'test_45' || g.grade_type === 'midterm').length === 0 && <span className="text-xs text-muted-foreground italic opacity-50">---</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2">
                                      {studentGrades.filter(g => g.grade_type === 'final').map(g => (
                                        <span key={g.id} onClick={() => { setCurrentGradeForm(g); setIsGradeModalOpen(true); }} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-black border border-red-100/50 cursor-pointer hover:bg-red-100 transition-colors">{g.score}</span>
                                      ))}
                                      {studentGrades.filter(g => g.grade_type === 'final').length === 0 && <span className="text-xs text-muted-foreground italic opacity-50">---</span>}
                                    </div>
                                  </td>
                                  <td className="px-6 py-5 text-center">
                                    <button
                                      onClick={() => {
                                        setCurrentGradeForm({
                                          student_id: student.id,
                                          score: 0,
                                          grade_type: 'quiz_15',
                                          note: '',
                                          semester: gradeFilters.semester,
                                          year: gradeFilters.year
                                        })
                                        setIsGradeModalOpen(true)
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-500/20"
                                      title="Thêm điểm nhanh"
                                    >
                                      <Plus className="w-5 h-5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {activeTab === 'statistics' && (
                <div className="space-y-10">
                  {/* Premium Welcome Banner (Inspired by user request) */}
                  <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-[3rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-10 lg:p-16 text-white overflow-hidden shadow-2xl shadow-slate-900/20"
                  >
                    {/* Abstract background shapes */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/20 to-transparent"></div>
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-10 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl animate-pulse"></div>

                    <div className="relative z-10 lg:w-2/3">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-black uppercase tracking-[0.2em] mb-6">
                        <Sparkles className="w-3.5 h-3.5" /> PHÒNG ĐIỀU HÀNH THÔNG MINH
                      </div>
                      <h2 className="text-4xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                        Quản lý tối ưu <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Giảng dạy đột phá.</span>
                      </h2>
                      <p className="text-slate-400 text-lg mb-10 max-w-lg font-medium leading-relaxed">
                        Sử dụng sức mạnh AI để tự động hóa quy trình soạn bài và theo dõi sát sao tiến độ học tập của từng học sinh.
                      </p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setActiveTab('ai-generate')}
                          className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
                        >
                          TẠO BÀI AI <ArrowRight className="w-5 h-5" />
                        </button>
                        {/* <button
                          onClick={() => setActiveTab('students')}
                          className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-white/20 transition-all active:scale-95"
                        >
                          QUẢN LÝ LỚP
                        </button> */}
                      </div>
                    </div>

                    <div className="absolute right-10 bottom-0 top-0 hidden xl:flex items-center">
                      <div className="relative">
                        <div className="w-72 h-72 bg-blue-600/30 rounded-full blur-3xl absolute -inset-4"></div>
                        <motion.div
                          animate={{ y: [0, -20, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="w-64 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-xl border border-white/30 rounded-[3rem] p-8 flex flex-col justify-end shadow-2xl relative"
                        >
                          <div className="absolute -top-10 -right-10 w-24 h-24 bg-white rounded-3xl p-4 shadow-xl rotate-12 flex items-center justify-center">
                            <Zap className="w-12 h-12 text-amber-500" />
                          </div>
                          <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Hiệu suất dạy học</p>
                          <p className="text-4xl font-black text-white">95%</p>
                          <p className="text-sm text-slate-300 font-medium leading-tight">Dựa trên sự tương tác của học sinh qua các bài giảng</p>
                        </motion.div>
                      </div>
                    </div>
                  </motion.section>
                  {/* Primary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Tổng số học sinh', value: statistics?.total_students || 0, icon: GraduationCap, color: 'blue', trend: '+12% month' },
                      { label: 'Tỉ suất hoàn thành', value: statistics?.completed_exercises || 0, icon: Target, color: 'purple', trend: '85% avg' },
                      { label: 'Hệ thống bài học', value: statistics?.total_lessons || 0, icon: BookOpen, color: 'green', trend: '12 new' },
                      { label: 'Tổng điểm tích lũy', value: statistics?.total_points_earned || 0, icon: Award, color: 'orange', trend: '+2.4k' },
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125`}></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center text-${stat.color}-600 dark:text-${stat.color}-400`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/50 text-${stat.color}-700 dark:text-${stat.color}-300`}>{stat.trend}</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-foreground mb-1 relative z-10">{stat.value.toLocaleString()}</h3>
                        <p className="text-muted-foreground text-sm font-medium relative z-10">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Secondary Stats & Grade Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-card p-8 rounded-2xl border border-border shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-foreground">Phân bố học sinh theo khối</h3>
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {['thcs_6', 'thcs_7', 'thcs_8', 'thcs_9', 'thpt_10', 'thpt_11', 'thpt_12'].map((grade) => (
                          <div key={grade} className="p-4 bg-muted rounded-xl border border-border text-center">
                            <p className="text-xs text-muted-foreground font-bold uppercase mb-1">{grade.replace('_', ' ')}</p>
                            <p className="text-2xl font-black text-foreground">{gradeStats[grade] || 0}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold mb-2">Hết mình vì giáo dục</h3>
                        <p className="text-blue-100 text-sm leading-relaxed opacity-80">Hệ thống đang phục vụ hàng nghìn bài học mỗi ngày. Hãy tiếp tục cập nhật nội dung chất lượng.</p>
                      </div>
                      <div className="mt-8">
                        <button onClick={() => setActiveTab('lesson')} className="w-full py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5" /> Thêm bài học mới
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recent Violations relocated from Proctoring Tab */}
                  <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border flex items-center justify-between">
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Bell className="w-5 h-5 text-red-500" />
                        Danh sách vi phạm gần đây (Hệ thống)
                      </h3>
                      <button onClick={loadViolations} className="text-xs font-bold text-blue-600 hover:underline">Làm mới</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Học sinh</th>
                            <th className="px-6 py-4">Nội dung</th>
                            <th className="px-6 py-4">Loại vi phạm</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                          {violations.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground italic">Chưa có vi phạm nào được ghi nhận</td>
                            </tr>
                          ) : (
                            violations.slice(0, 5).map((v) => (
                              <tr key={v.id} className="hover:bg-muted/50 transition-colors text-foreground">
                                <td className="px-6 py-4">
                                  <span className="font-bold block">{v.full_name || v.username || 'Học sinh'}</span>
                                  <span className="text-xs text-muted-foreground">@{v.username || 'unknown'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded-full bg-accent/50 text-[10px] font-bold text-accent-foreground">{v.item_type}</span>
                                  <span className="ml-2 font-medium">{v.item_title}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {v.evidence_url && (
                                      <div
                                        className="w-8 h-8 rounded bg-muted flex-shrink-0 cursor-zoom-in overflow-hidden border border-border"
                                        onClick={() => setZoomedImage(`${API_URL}${v.evidence_url}`)}
                                      >
                                        <img src={`${API_URL}${v.evidence_url}`} alt="Thumbnail" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    <span className="text-red-600 font-medium">{v.violation_type}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {v.evidence_url && (
                                      <button
                                        onClick={() => setZoomedImage(`${API_URL}${v.evidence_url}`)}
                                        className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Xem bằng chứng"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleScanViolation(v.id)}
                                      className="p-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 transition-colors"
                                      title="AI Quét"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteViolation(v.id)}
                                      className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="space-y-8">
                  <div className="bg-card p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Bảng Xếp Hạng Toàn Hệ Thống</h3>
                      <p className="text-sm text-muted-foreground">Xếp hạng dựa trên tổng điểm và chuỗi học tập của học sinh</p>
                    </div>
                    <button onClick={loadLeaderboard} className="text-xs font-bold text-blue-600 hover:underline">Làm mới</button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {leaderboard.map((u, idx) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`bg-card rounded-2xl border border-border overflow-hidden group hover:shadow-xl transition-all relative ${idx < 3 ? 'ring-2 ring-primary/20' : ''}`}
                      >
                        {/* Rank Badge */}
                        <div className={`absolute top-0 right-0 p-4 font-black italic text-4xl opacity-10 group-hover:opacity-20 transition-opacity ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-500' : 'text-gray-400'}`}>
                          #{idx + 1}
                        </div>

                        <div className="p-6 flex items-center gap-6">
                          <div className="relative">
                            <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 ${idx === 0 ? 'border-amber-400' : idx === 1 ? 'border-slate-300' : idx === 2 ? 'border-orange-300' : 'border-border'}`}>
                              <img
                                src={u.avatar_url ? `${API_URL}${u.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                                className="w-full h-full object-cover"
                                alt={u.username}
                              />
                            </div>
                            {idx < 3 && (
                              <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-500'}`}>
                                <Trophy className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-foreground truncate">{u.full_name || u.username}</h4>
                              <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                {u.grade_level?.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono truncate">@{u.username}</p>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 text-orange-500 font-black text-lg">
                                <Flame className="w-4 h-4 fill-current" />
                                {u.study_streak || 0}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Chuỗi</p>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600 dark:text-blue-400 font-black text-xl">
                                {u.total_points?.toLocaleString() || 0}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Điểm</p>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar at bottom */}
                        <div className="h-1 w-full bg-muted mt-auto">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (u.lessons_completed || 0) * 10)}%` }}
                            className={`h-full ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-blue-500'}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'violations' && (
                <div className="space-y-8">
                  <div className="bg-card p-10 rounded-[3rem] border border-border shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                      <div>
                        <h3 className="text-3xl font-black text-foreground mb-2">Giám sát AI Thời gian thực</h3>
                        <p className="text-muted-foreground font-medium">Theo dõi hoạt động, phân tích AI và cảnh báo vi phạm tự động</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Global Monitoring Settings Icon & Popover */}
                        <div className="relative">
                          <button
                            onClick={() => setShowMonitoringSettings(!showMonitoringSettings)}
                            className={`p-3 rounded-2xl border border-border transition-all flex items-center justify-center ${showMonitoringSettings ? 'bg-blue-600 text-white shadow-lg' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                            title="Cấu hình giám sát hệ thống"
                          >
                            <Settings className={`w-6 h-6 ${showMonitoringSettings ? 'animate-spin-slow' : ''}`} />
                          </button>

                          {/* Global Monitoring Settings Modal */}
                          <AnimatePresence>
                            {showMonitoringSettings && (
                              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setShowMonitoringSettings(false)}
                                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                  className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
                                >
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full -ml-16 -mb-16 blur-2xl" />

                                  <div className="flex items-center justify-between mb-8 relative">
                                    <div>
                                      <h4 className="text-2xl font-black tracking-tight">Cấu hình Giám sát</h4>
                                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Hệ thống toàn cục</p>
                                    </div>
                                    <button
                                      onClick={() => setShowMonitoringSettings(false)}
                                      className="p-2.5 hover:bg-muted rounded-2xl transition-colors border border-border"
                                    >
                                      <X className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                  </div>

                                  <div className="space-y-4 relative">
                                    {/* Row 1: AI Monitoring (Corrected) */}
                                    <div className="flex items-center justify-between p-5 bg-muted/40 rounded-[2rem] border border-border/50 hover:bg-muted/60 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
                                          <Zap className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black">Giám sát AI</p>
                                          <p className="text-[10px] text-muted-foreground font-medium">Bảo mật & phát hiện gian lận bằng AI</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleToggleProctoring(!isGlobalProctoring)}
                                        className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 ${isGlobalProctoring ? 'bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-300'}`}
                                      >
                                        <motion.div
                                          animate={{ x: isGlobalProctoring ? 28 : 0 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                          className="w-5 h-5 bg-white rounded-full shadow-md"
                                        />
                                      </button>
                                    </div>

                                    {/* Row 2: Social Media Monitoring */}
                                    <div className="flex items-center justify-between p-5 bg-muted/40 rounded-[2rem] border border-border/50 hover:bg-muted/60 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                                          <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black">Giám sát MXH</p>
                                          <p className="text-[10px] text-muted-foreground font-medium">Theo dõi các nền tảng mạng xã hội</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleToggleSocialMonitoring(!isGlobalSocialMonitoring)}
                                        className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 ${isGlobalSocialMonitoring ? 'bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-slate-300'}`}
                                      >
                                        <motion.div
                                          animate={{ x: isGlobalSocialMonitoring ? 28 : 0 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                          className="w-5 h-5 bg-white rounded-full shadow-md"
                                        />
                                      </button>
                                    </div>

                                    {/* Row 3: Test Monitoring (Corrected) */}
                                    <div className="flex items-center justify-between p-5 bg-muted/40 rounded-[2rem] border border-border/50 hover:bg-muted/60 transition-colors">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                                          <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black">Giám sát Kiểm tra</p>
                                          <p className="text-[10px] text-muted-foreground font-medium">Bảo mật phòng thi nghiêm ngặt</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleToggleTestMonitoring(!isGlobalTestMonitoring)}
                                        className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 ${isGlobalTestMonitoring ? 'bg-red-600 shadow-lg shadow-red-500/30' : 'bg-slate-300'}`}
                                      >
                                        <motion.div
                                          animate={{ x: isGlobalTestMonitoring ? 28 : 0 }}
                                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                          className="w-5 h-5 bg-white rounded-full shadow-md"
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-8 pt-6 border-t border-border/50 text-center relative">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                      <Shield className="w-3 h-3 text-blue-500" /> Thiết lập hệ thống bảo mật
                                    </p>
                                    <p className="text-[9px] text-muted-foreground italic mt-2 opacity-60">
                                      * Các thiết lập này áp dụng trên toàn bộ nền tảng giáo dục
                                    </p>
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex items-center gap-2 bg-muted p-1.5 rounded-2xl border border-border">
                          {(['all', 'online', 'offline'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setMonitoringFilter({ ...monitoringFilter, status: s })}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${monitoringFilter.status === s ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {s === 'all' ? 'Tất cả' : s === 'online' ? 'Trực tuyến' : 'Ngoại tuyến'}
                            </button>
                          ))}
                        </div>
                        <select
                          className="px-4 py-3 bg-muted border border-border rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-foreground transition-all"
                          value={monitoringFilter.classId}
                          onChange={(e) => setMonitoringFilter({ ...monitoringFilter, classId: e.target.value })}
                        >
                          <option value="all">Tất cả lớp học</option>
                          {classes.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                        <select
                          className="px-4 py-3 bg-muted border border-border rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-foreground transition-all"
                          value={monitoringFilter.grade}
                          onChange={(e) => setMonitoringFilter({ ...monitoringFilter, grade: e.target.value })}
                        >
                          <option value="all">Tất cả khối</option>
                          <option value="thcs_6">Lớp 6</option>
                          <option value="thcs_7">Lớp 7</option>
                          <option value="thcs_8">Lớp 8</option>
                          <option value="thcs_9">Lớp 9</option>
                          <option value="thpt_10">Lớp 10</option>
                          <option value="thpt_11">Lớp 11</option>
                          <option value="thpt_12">Lớp 12</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {studentMonitoring
                        .filter(s => {
                          const matchesStatus = monitoringFilter.status === 'all' || (monitoringFilter.status === 'online' ? (new Date().getTime() - new Date(s.last_activity).getTime() < 120000) : (new Date().getTime() - new Date(s.last_activity).getTime() >= 120000))
                          const matchesClass = monitoringFilter.classId === 'all' || String(s.current_class_id) === monitoringFilter.classId
                          const matchesGrade = monitoringFilter.grade === 'all' || s.grade_level === monitoringFilter.grade
                          const matchesSearch = !searchQuery || s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.username.toLowerCase().includes(searchQuery.toLowerCase())
                          return matchesStatus && matchesClass && matchesGrade && matchesSearch
                        })
                        .map((s) => {
                          const isOnline = s.last_activity ? (new Date().getTime() - new Date(s.last_activity).getTime() < 120000) : false;

                          return (
                            <motion.div
                              key={s.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-muted/30 rounded-[2.5rem] p-6 border border-border hover:border-blue-500/50 transition-all group relative overflow-hidden"
                            >
                              {/* Online status indicator */}
                              <div className="absolute top-6 right-6 flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                  <img
                                    src={s.avatar_url ? `${API_URL}${s.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.username}`}
                                    className="w-full h-full object-cover"
                                    alt={s.username}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-slate-800 truncate">{s.full_name || s.username}</h4>
                                    {s.class_name && (
                                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-wider">
                                        {s.class_name}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{s.username}</p>
                                </div>
                                <div className="ml-auto">
                                </div>
                              </div>

                              <div className="space-y-4 mb-6">
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.1em] mb-1">Hoạt động hiện tại</p>
                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                                    {s.participation_status || 'Chưa tham gia hoạt động'}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                                      {s.os_info?.toLowerCase().includes('win') ? <div className="font-black text-[10px]">WIN</div> : <MapIcon className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-black text-slate-400 uppercase">OS</p>
                                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{s.os_info || 'N/A'}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 text-[10px] font-black">
                                      WEB
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[9px] font-black text-slate-400 uppercase">BSR</p>
                                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{s.browser_info || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    handleLoadParticipation(s.id, 'violation')
                                    toast(`Hiển thị lịch sử vi phạm cho ${s.username}`, 'info')
                                  }}
                                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all font-black text-[10px] uppercase flex items-center justify-center gap-2 group relative overflow-hidden"
                                  title="Xem chi tiết vi phạm"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                  <span>Lịch sử vi phạm</span>
                                  {violations.filter(v => v.user_id === s.id).length > 0 ? (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black min-w-[20px]">
                                      {violations.filter(v => v.user_id === s.id).length}
                                    </span>
                                  ) : (
                                    <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[9px] font-black min-w-[20px]">0</span>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>

                    <div className="mt-12 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                      <div className="p-6 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-foreground flex items-center gap-2 text-lg">
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                          Lịch sử vi phạm Toàn hệ thống
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="relative w-48 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Tìm học sinh, nội dung..."
                              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground"
                              value={violationSearchQuery}
                              onChange={(e) => setViolationSearchQuery(e.target.value)}
                            />
                          </div>
                          <select
                            className="px-3 py-2 bg-muted border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={violationTypeFilter}
                            onChange={(e) => setViolationTypeFilter(e.target.value)}
                          >
                            <option value="all">Tất cả loại</option>
                            <option value="Chuyển Tab">Chuyển Tab</option>
                            <option value="Proxy">Phát hiện Proxy</option>
                            <option value="Mạng xã hội">Mạng xã hội</option>
                            <option value="AI Phát hiện">AI Phát hiện</option>
                          </select>
                          <select
                            className="px-3 py-2 bg-muted border border-border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={violationClassFilter}
                            onChange={(e) => setViolationClassFilter(e.target.value)}
                          >
                            <option value="all">Tất cả lớp</option>
                            {classes.map((c: any) => (
                              <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                          </select>
                          <button onClick={loadViolations} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Làm mới">
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleDeleteAllViolations}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Xóa tất cả vi phạm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            <tr>
                              <th className="px-6 py-4">Học sinh</th>
                              <th className="px-6 py-4">Nội dung</th>
                              <th className="px-6 py-4">Loại vi phạm</th>
                              <th className="px-6 py-4">AI Đánh giá</th>
                              <th className="px-6 py-4">Thời gian</th>
                              <th className="px-6 py-4 text-center">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-sm">
                            {filteredViolations.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic font-medium">
                                  <div className="flex flex-col items-center gap-2">
                                    <Shield className="w-8 h-8 opacity-20" />
                                    Không tìm thấy dữ liệu vi phạm phù hợp
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              filteredViolations.map((v) => (
                                <tr key={v.id} className="hover:bg-muted/50 transition-colors text-foreground group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                        <img src={v.avatar_url ? `${API_URL}${v.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${v.username}`} alt="avatar" />
                                      </div>
                                      <div>
                                        <span className="font-bold block text-xs">{v.full_name || v.username || 'Học sinh'}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] text-muted-foreground">@{v.username || 'unknown'}</span>
                                          {v.class_name && (
                                            <>
                                              <span className="text-[10px] text-muted-foreground/30">•</span>
                                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{v.class_name}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="px-2 py-0.5 rounded-lg bg-accent/50 text-[9px] font-black text-accent-foreground w-fit uppercase">{v.item_type}</span>
                                      <span className="font-bold text-xs truncate max-w-[200px]">{v.item_title}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      {v.evidence_url && (
                                        <div
                                          className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 cursor-zoom-in overflow-hidden border border-border group-hover:border-red-500/50 transition-colors"
                                          onClick={() => setZoomedImage(`${API_URL}${v.evidence_url}`)}
                                        >
                                          <img src={`${API_URL}${v.evidence_url}`} alt="Thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      <span className="text-red-600 font-black text-xs">{v.violation_type}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {v.ai_scanning ? (
                                      <div className="flex items-center gap-2 text-[10px] text-blue-500 font-black animate-pulse uppercase tracking-tighter">
                                        <LoadingSpinner size="sm" text="" className="!w-3 !h-3" noContainer />
                                        AI đang quét...
                                      </div>
                                    ) : v.ai_analysis ? (
                                      <div className="flex flex-col gap-1 max-w-[150px]">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-1.5 h-1.5 rounded-full ${v.ai_confidence > 70 ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                          <span className="text-[9px] font-black uppercase text-foreground/50">{v.ai_confidence}% Tin cậy</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground italic leading-tight">"{v.ai_analysis}"</span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-muted-foreground italic font-medium">Chưa có đánh giá</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      {new Date(v.created_at).toLocaleString('vi-VN')}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {v.evidence_url && (
                                        <button
                                          onClick={() => setZoomedImage(`${API_URL}${v.evidence_url}`)}
                                          className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                                          title="Xem bằng chứng"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteViolation(v.id)}
                                        className="p-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                                        title="Xóa"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === 'students' || activeTab === 'staff') && (
                <div className="space-y-6">
                  <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-card">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, username..."
                            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        {activeTab === 'students' && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                              <select
                                onChange={(e) => setGradeFilter(e.target.value)}
                                value={gradeFilter}
                                className="px-3 py-1.5 bg-transparent text-sm font-semibold outline-none text-muted-foreground"
                              >
                                <option value="">Tất cả khối lớp</option>
                                <optgroup label="TRUNG HỌC CƠ SỞ">
                                  <option value="thcs_6">Lớp 6</option>
                                  <option value="thcs_7">Lớp 7</option>
                                  <option value="thcs_8">Lớp 8</option>
                                  <option value="thcs_9">Lớp 9</option>
                                </optgroup>
                                <optgroup label="TRUNG HỌC PHỔ THÔNG">
                                  <option value="thpt_10">Lớp 10</option>
                                  <option value="thpt_11">Lớp 11</option>
                                  <option value="thpt_12">Lớp 12</option>
                                </optgroup>
                              </select>
                            </div>

                            <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                              <select
                                onChange={(e) => setClassNameFilter(e.target.value)}
                                value={classNameFilter}
                                className="px-3 py-1.5 bg-transparent text-sm font-semibold outline-none text-muted-foreground"
                              >
                                <option value="">Tất cả lớp</option>
                                {availableClasses.map(cls => (
                                  <option key={cls} value={cls}>{cls}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        {activeTab === 'staff' && (
                          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                            <Briefcase className="w-4 h-4 ml-2 text-muted-foreground" />
                            <select
                              onChange={(e) => setStaffSpecializationFilter(e.target.value)}
                              value={staffSpecializationFilter}
                              className="px-3 py-1.5 bg-transparent text-sm font-semibold outline-none text-muted-foreground"
                            >
                              <option value="">Tất cả chuyên môn</option>
                              <option value="Toán học">Toán học</option>
                              <option value="Ngữ văn">Ngữ văn</option>
                              <option value="Tiếng Anh">Tiếng Anh</option>
                              <option value="Vật lý">Vật lý</option>
                              <option value="Hóa học">Hóa học</option>
                              <option value="Sinh học">Sinh học</option>
                              <option value="Lịch sử">Lịch sử</option>
                              <option value="Địa lý">Địa lý</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setRegisterFormData({ role: activeTab === 'students' ? 'student' : 'teacher' })
                          setShowRegisterForm(true)
                        }}
                        className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        Thêm {activeTab === 'students' ? 'học sinh' : 'cán bộ'}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                          <tr>
                            {activeTab === 'students' && <th className="px-6 py-4 text-center">Hạng</th>}
                            <th className="px-6 py-4">Thành viên</th>
                            <th className="px-6 py-4">Tên đăng nhập</th>
                            <th className="px-6 py-4">{activeTab === 'students' ? 'Lớp' : 'Chuyên môn'}</th>
                            <th className="px-6 py-4">Khối lớp</th>
                            <th className="px-6 py-4">Trường học</th>
                            {activeTab === 'students' && <th className="px-6 py-4">Điểm</th>}
                            <th className="px-6 py-4">Ngày tham gia</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {loading ? (
                            <tr><td colSpan={activeTab === 'students' ? 7 : 6} className="px-6 py-12 text-center text-gray-400">Đang tải danh sách...</td></tr>
                          ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={activeTab === 'students' ? 7 : 6} className="px-6 py-12 text-center text-gray-400">Không tìm thấy kết quả nào</td></tr>
                          ) : filteredUsers.map((u, idx) => (
                            <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                              {activeTab === 'students' && (
                                <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600 shadow-sm border border-amber-200' :
                                    idx === 1 ? 'bg-slate-100 text-slate-600 shadow-sm border border-slate-200' :
                                      idx === 2 ? 'bg-orange-100 text-orange-600 shadow-sm border border-orange-200' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                    {idx + 1}
                                  </span>
                                </td>
                              )}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white overflow-hidden shadow-sm flex-shrink-0">
                                    <img
                                      src={u.avatar_url ? `${API_URL}${u.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                                      alt={u.username}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-foreground leading-tight">{u.full_name || u.username}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{u.email || 'Chưa cập nhật email'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground whitespace-nowrap">@{u.username}</code>
                              </td>
                              <td className="px-6 py-4">
                                {activeTab === 'students' ? (
                                  <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                                    {u.class_name || 'CHƯA CÓ'}
                                  </span>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-foreground">{u.specialty || u.role.toUpperCase()}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium italic">{u.qualification || 'Cán bộ hệ hệ thống'}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.grade_level?.startsWith('thcs') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {u.grade_level ? u.grade_level.replace('_', ' ') : 'HỆ THỐNG'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-bold text-muted-foreground line-clamp-1 max-w-[150px]">
                                  {u.school || 'Hệ thống'}
                                </span>
                              </td>
                              {activeTab === 'students' && (
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg w-fit">
                                    <Award className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-sm font-black text-amber-700 dark:text-amber-400">{u.points || 0}</span>
                                  </div>
                                </td>
                              )}
                              <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                                {new Date(u.created_at).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {activeTab === 'staff' && user.username === 'admin' && u.role === 'teacher' && (
                                    <div className="flex items-center gap-3 mr-4">
                                      <span className="text-[10px] font-black text-blue-600 uppercase hidden sm:block">Quản trị toàn phần</span>
                                      <button
                                        onClick={() => handleToggleTeacherAccess(u.id, !u.is_full_access)}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 outline-none ${u.is_full_access ? 'bg-blue-600' : 'bg-muted border border-border'}`}
                                      >
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${u.is_full_access ? 'translate-x-5' : 'translate-x-0'} shadow-sm flex items-center justify-center`}>
                                          {u.is_full_access && <Shield className="w-2.5 h-2.5 text-blue-600" />}
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setSelectedUser(u)}
                                    className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors group-hover:scale-110"
                                    title="Xem chi tiết"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors group-hover:scale-110"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {(['lesson', 'exercise', 'test', 'vocabulary'].includes(activeTab)) && (
                <div className="space-y-8">
                  {(activeTab as any) === 'exercise' ? (
                    <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Thư viện Bài tập</h3>
                        <p className="text-slate-400 font-medium">Quản lý và thiết kế các bộ câu hỏi ôn luyện.</p>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={handleSystemCleanup}
                          disabled={isSubmitting}
                          className="px-6 py-3 bg-amber-50 text-amber-600 border border-amber-100 font-bold rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                          title="Sửa lỗi các bài tập bị kẹt không thể xóa"
                        >
                          <Wrench className="w-4 h-4" />
                          Dọn dẹp & Sửa lỗi
                        </button>
                        <button
                          onClick={() => {
                            setFormData({
                              type: 'abcd',
                              grade_level: '',
                              subject: 'anh',
                              word: '',
                              meaning: '',
                              pronunciation: '',
                              example: '',
                              vocab_type: 'speaking'
                            })
                            setMcqOptions(['', '', '', ''])
                            setCorrectOptionIndex(0)
                            setQuestionsList([])
                            setShowCreateModal(true)
                          }}
                          className="px-8 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                          TẠO BÀI TẬP MỚI <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl shadow-sm border border-border">
                      <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">
                          {activeTab === 'lesson' && 'Quản Lý Bài Học SGK'}
                          {(activeTab as any) === 'exercise' && 'Ngân Hàng Bài Tập'}
                          {activeTab === 'test' && 'Quản Lý Bài Kiểm Tra'}
                          {activeTab === 'vocabulary' && 'Kho Từ Vựng'}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {activeTab === 'lesson' && `Hiện có ${lessons.length} bài học trong hệ thống`}
                          {(activeTab as any) === 'exercise' && `Hiện có ${exercisesData.length} bài luyện tập`}
                          {activeTab === 'test' && `Hiện có ${tests.length} bài kiểm tra`}
                          {activeTab === 'vocabulary' && `Hiện có ${vocabList.length} từ vựng`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({
                            type: 'abcd',
                            grade_level: '',
                            subject: 'anh',
                            word: '',
                            meaning: '',
                            pronunciation: '',
                            example: '',
                            vocab_type: 'speaking'
                          })
                          setMcqOptions(['', '', '', ''])
                          setCorrectOptionIndex(0)
                          setQuestionsList([])
                          setShowCreateModal(true)
                        }}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" /> Thêm mới
                      </button>
                    </div>
                  )}


                  {/* Content Filters */}
                  <div className="bg-card p-4 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder={
                          activeTab === 'vocabulary' ? "Tìm kiếm từ vựng, nghĩa..." :
                            activeTab === 'test' ? "Tìm kiếm bài kiểm tra..." :
                              "Tìm kiếm bài học..."
                        }
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground placeholder:text-muted-foreground"
                        value={contentFilters.search}
                        onChange={(e) => setContentFilters({ ...contentFilters, search: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (activeTab === 'lesson') loadLessons();
                            else if (activeTab === 'exercise') loadExercises();
                            else if (activeTab === 'test') loadTests();
                            else if (activeTab === 'vocabulary') loadVocabulary();
                          }
                        }}
                      />
                    </div>

                    <select
                      className="w-full md:w-auto px-4 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground font-semibold"
                      value={contentFilters.grade_level}
                      onChange={(e) => setContentFilters({ ...contentFilters, grade_level: e.target.value })}
                    >
                      <option value="">Tất cả khối lớp</option>
                      <optgroup label="TRUNG HỌC CƠ SỞ">
                        <option value="thcs_6">Lớp 6</option>
                        <option value="thcs_7">Lớp 7</option>
                        <option value="thcs_8">Lớp 8</option>
                        <option value="thcs_9">Lớp 9</option>
                      </optgroup>
                      <optgroup label="TRUNG HỌC PHỔ THÔNG">
                        <option value="thpt_10">Lớp 10</option>
                        <option value="thpt_11">Lớp 11</option>
                        <option value="thpt_12">Lớp 12</option>
                      </optgroup>
                    </select>

                    <select
                      className="w-full md:w-auto px-4 py-2 bg-muted border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-foreground font-semibold"
                      value={contentFilters.subject}
                      onChange={(e) => setContentFilters({ ...contentFilters, subject: e.target.value })}
                    >
                      <option value="">Tất cả môn học</option>
                      <option value="toan">Toán học</option>
                      <option value="van">Ngữ văn</option>
                      <option value="anh">Tiếng Anh</option>
                      <option value="ly">Vật lý</option>
                      <option value="hoa">Hóa học</option>
                      <option value="sinh">Sinh học</option>
                      <option value="su">Lịch sử</option>
                      <option value="dia">Địa lý</option>
                    </select>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => {
                          const loadFn = activeTab === 'lesson' ? loadLessons :
                            activeTab === 'exercise' ? loadExercises :
                              activeTab === 'test' ? loadTests : loadVocabulary
                          loadFn()
                        }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Tải lại & Áp dụng Filter"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4">Thông tin</th>
                            <th className="px-6 py-4">Phân loại</th>
                            {activeTab === 'exercise' && <th className="px-6 py-4">Bài học liên quan</th>}
                            {activeTab === 'test' && <th className="px-6 py-4">Câu hỏi & Thời gian</th>}
                            {activeTab === 'lesson' && <th className="px-6 py-4">Nội dung</th>}
                            {activeTab === 'vocabulary' && (
                              <>
                                <th className="px-6 py-4">Nghĩa</th>
                                <th className="px-6 py-4">Môn & Lớp</th>
                              </>
                            )}
                            <th className="px-6 py-4">Ngày tạo</th>
                            <th className="px-6 py-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {loading && lessons.length === 0 && tests.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">Đang tải dữ liệu...</td></tr>
                          ) : (
                            <>
                              {activeTab === 'lesson' && lessons.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-foreground leading-tight">{item.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black tracking-widest">{item.subject}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      {item.grade_level ? item.grade_level.replace('_', ' ') : 'CHƯA CHỌN'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.content?.substring(0, 50)}...</p>
                                      {item.file_path && (
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                          <Paperclip className="w-3 h-3" /> CÓ TÀI LIỆU ĐÍNH KÈM
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => handleView(item, 'lesson')} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteLesson(item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {activeTab === 'exercise' && exercisesData.map((item) => {
                                const hasEssay = item.questions?.some((q: any) => q.type === 'essay');
                                return (
                                  <tr key={item.id} className="hover:bg-accent/30 transition-colors group">
                                    <td className="px-6 py-4">
                                      <p className="text-sm font-bold text-foreground leading-tight">{item.title || item.question}</p>
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${hasEssay ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                                        {hasEssay ? 'TỰ LUẬN' : 'TRẮC NGHIỆM'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="text-xs font-bold text-muted-foreground">{item.total_questions || item.questions_count || 1} CÂU HỎI</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">{item.lesson_title || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(item.created_at || Date.now()).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => {
                                            setSelectedResultItem(item)
                                            handleLoadParticipation(item.id, 'exercise')
                                          }}
                                          className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                          title="Xem tham gia"
                                        >
                                          <Users className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleView(item, 'exercise')} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteExercise(item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {activeTab === 'test' && tests.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-foreground leading-tight">{item.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black tracking-widest">{item.subject}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                      {item.grade_level ? item.grade_level.replace('_', ' ') : 'CHƯA CHỌN'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground font-bold">{item.total_questions || item.questions_count} CÂU HỎI • {item.duration} PHÚT</td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(item.created_at || Date.now()).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedResultItem(item)
                                          handleLoadParticipation(item.id, 'test')
                                        }}
                                        className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                        title="Xem tham gia"
                                      >
                                        <Users className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleView(item, 'test')} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteTest(item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {activeTab === 'vocabulary' && vocabList.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-foreground leading-tight">{item.word}</p>
                                    <p className="text-xs text-muted-foreground italic font-medium">{item.phonetic || item.pronunciation}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
                                      ${item.type === 'writing' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                        item.type === 'speaking' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                                      {(() => {
                                        switch (item.type) {
                                          case 'writing': return 'WRITING';
                                          case 'speaking': return 'SPEAKING';
                                          case 'reading': return 'READING';
                                          default: return 'VOCABULARY';
                                        }
                                      })()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">{item.meaning}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-slate-500">
                                        {item.subject === 'anh' ? 'Tiếng Anh' : item.subject === 'toan' ? 'Toán' : item.subject === 'van' ? 'Ngữ Văn' : item.subject}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                                        {item.grade_level ? item.grade_level.replace('_', ' ') : 'ALL'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(item.created_at || Date.now()).toLocaleDateString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => {
                                          setSelectedResultItem(item)
                                          handleLoadParticipation(item.id, 'vocabulary')
                                        }}
                                        className="p-2 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                                        title="Xem tham gia"
                                      >
                                        <Users className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleView(item, 'vocabulary')} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteVocabulary(item.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity-logs' && (
                <div className="space-y-6">
                  <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Nhật ký Hoạt động Cán bộ</h3>
                        <p className="text-muted-foreground font-medium">Giám sát các thao tác quản trị và thay đổi nội dung trên hệ thống</p>
                      </div>
                      <button
                        onClick={loadActivityLogs}
                        className="px-6 py-2.5 bg-muted text-foreground font-bold rounded-xl hover:bg-accent transition-all flex items-center gap-2"
                      >
                        <RefreshCcw className="w-4 h-4" /> LÀM MỚI
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-5">Thời gian</th>
                            <th className="px-6 py-5">Cán bộ</th>
                            <th className="px-6 py-5">Thao tác</th>
                            <th className="px-6 py-5">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activityLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic font-medium">
                                <div className="flex flex-col items-center gap-4">
                                  <Calendar className="w-12 h-12 opacity-10" />
                                  <p>Chưa có bản ghi hoạt động nào.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            activityLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-5">
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {new Date(log.created_at).toLocaleString('vi-VN')}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                      {log.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-sm">@{log.username}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <p className="text-sm text-foreground/80 font-medium">{log.details}</p>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data-management' && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-3 mb-8 font-bold text-xl uppercase tracking-tight">
                        <FileText className="w-6 h-6 text-blue-500" />
                        Xuất dữ liệu
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => handleExportData('schools')} className="flex items-center justify-between p-5 bg-muted/50 hover:bg-muted rounded-2xl transition-all group border border-transparent hover:border-blue-500/30">
                          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground">Danh sách Trường học</span>
                          <Download className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100" />
                        </button>
                        <button onClick={() => handleExportData('students')} className="flex items-center justify-between p-5 bg-muted/50 hover:bg-muted rounded-2xl transition-all group border border-transparent hover:border-blue-500/30">
                          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground">Danh sách Học sinh</span>
                          <Download className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100" />
                        </button>
                        <button onClick={() => handleExportData('staff')} className="flex items-center justify-between p-5 bg-muted/50 hover:bg-muted rounded-2xl transition-all group border border-transparent hover:border-blue-500/30">
                          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground">Danh sách Cán bộ (GV/Admin)</span>
                          <Download className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-3 mb-8 font-bold text-xl uppercase tracking-tight">
                        <FileUp className="w-6 h-6 text-green-500" />
                        Nhập dữ liệu
                      </div>
                      <div className="space-y-6">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl p-12 hover:bg-muted/30 cursor-pointer transition-all hover:border-green-500/30 group">
                          <input type="file" className="hidden" accept=".csv" onChange={(e) => e.target.files?.[0] && handleImportUsers(e.target.files[0])} />
                          <Upload className="w-12 h-12 text-muted-foreground mb-4 group-hover:text-green-500 transition-colors" />
                          <span className="text-base font-bold">Tải lên file CSV</span>
                          <span className="text-xs text-muted-foreground mt-2 text-center">Cấu trúc: username, password, full_name, role</span>
                        </label>
                        {importingUsers && <div className="flex items-center justify-center gap-2 text-sm font-bold text-blue-500"><LoadingSpinner size="sm" /> Đang nhập liệu...</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Phản hồi hệ thống</h3>
                      <p className="text-muted-foreground font-medium">Tất cả phản hồi và góp ý từ người dùng</p>
                    </div>
                    <button
                      onClick={handleAnalyzeFeedback}
                      disabled={loadingAnalysis || feedbackList.length === 0}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                      {loadingAnalysis ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                      PHÂN TÍCH AI
                    </button>
                  </div>

                  {aiAnalysisResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 p-8 rounded-3xl mb-8 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-6 text-lg uppercase tracking-tight">
                        <Sparkles className="w-6 h-6" />
                        Phân tích & Đề xuất AI
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed font-medium text-foreground/80">
                        {aiAnalysisResult}
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-5">Người gửi</th>
                            <th className="px-6 py-5">Trường</th>
                            <th className="px-6 py-5">Chủ đề</th>
                            <th className="px-6 py-5">Trạng thái</th>
                            <th className="px-6 py-5">Ngày gửi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {feedbackList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic font-medium">
                                <div className="flex flex-col items-center gap-4">
                                  <MessageSquare className="w-12 h-12 opacity-10" />
                                  <p>Chưa có phản hồi nào từ người dùng.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            feedbackList.map((feedback) => (
                              <tr key={feedback.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-5">
                                  <div className="font-bold text-sm">{feedback.full_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">@{feedback.username}</div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="text-sm font-medium">{feedback.school_name || 'Hệ thống'}</span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="font-bold text-sm text-foreground/90">{feedback.subject}</div>
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{feedback.message}</div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${feedback.status === 'resolved'
                                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    }`}>
                                    {feedback.status === 'resolved' ? 'Đã xử lý' : 'Đang chờ'}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-xs text-muted-foreground font-medium">
                                  {new Date(feedback.created_at).toLocaleDateString('vi-VN')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="space-y-6">
                  <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Thông báo Hệ thống</h3>
                        <p className="text-muted-foreground font-medium">Quản lý các thông báo quan trọng gửi tới toàn bộ người dùng</p>
                      </div>
                      <button
                        onClick={() => setShowAnnouncementModal(true)}
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                      >
                        <Plus className="w-4 h-4" /> ĐĂNG THÔNG BÁO
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-left">
                        <thead className="bg-muted/50 text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-5">Tiêu đề</th>
                            <th className="px-6 py-5">Đối tượng</th>
                            <th className="px-6 py-5">Loại</th>
                            <th className="px-6 py-5">Ngày đăng</th>
                            <th className="px-6 py-5">Hết hạn</th>
                            <th className="px-6 py-5 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {announcements.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic font-medium">
                                <div className="flex flex-col items-center gap-4">
                                  <Bell className="w-12 h-12 opacity-10" />
                                  <p>Chưa có thông báo nào được đăng.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            announcements.map((ann) => (
                              <tr key={ann.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-5">
                                  <div>
                                    <p className="font-bold text-sm text-foreground">{ann.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ann.content}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                                    {ann.target_role === 'all' ? 'Tất cả' : ann.target_role === 'student' ? 'Học sinh' : 'Giáo viên'}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${ann.type === 'info' ? 'bg-blue-50 text-blue-600' :
                                    ann.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                                      'bg-red-50 text-red-600'
                                    }`}>
                                    {ann.type}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(ann.created_at).toLocaleDateString('vi-VN')}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="text-xs text-muted-foreground">
                                    {ann.expires_at ? new Date(ann.expires_at).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <button
                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data-management' && (
                <div className="space-y-8">
                  <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">Quản lý Dữ liệu</h3>
                    <p className="text-muted-foreground font-medium mb-8">Xuất và nhập dữ liệu hệ thống thông qua tệp tin CSV</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-6 rounded-2xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <Upload className="w-6 h-6 rotate-180" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">Xuất dữ liệu (Export)</h4>
                            <p className="text-xs text-muted-foreground">Tải về dữ liệu hệ thống định dạng CSV</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={() => handleExportData('schools')}
                            className="w-full py-3 px-4 bg-white border border-border rounded-xl text-sm font-bold flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 transition-all group"
                          >
                            <span>Dữ liệu Trường học</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleExportData('students')}
                            className="w-full py-3 px-4 bg-white border border-border rounded-xl text-sm font-bold flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 transition-all group"
                          >
                            <span>Dữ liệu Học sinh</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleExportData('staff')}
                            className="w-full py-3 px-4 bg-white border border-border rounded-xl text-sm font-bold flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 transition-all group"
                          >
                            <span>Dữ liệu Cán bộ</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                          </button>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-muted/50 border border-border">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <FileUp className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">Nhập dữ liệu (Import)</h4>
                            <p className="text-xs text-muted-foreground">Thêm hàng loạt người dùng từ tệp CSV</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div
                            className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:bg-emerald-50/50 hover:border-emerald-200 transition-all cursor-pointer relative"
                            onClick={() => document.getElementById('csv-import')?.click()}
                          >
                            <input
                              type="file"
                              id="csv-import"
                              className="hidden"
                              accept=".csv"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleImportUsers(file)
                              }}
                            />
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="w-10 h-10 text-muted-foreground mb-2" />
                              <p className="text-sm font-bold text-foreground">Kéo thả hoặc nhấp để tải lên tệp CSV</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Hỗ trợ định dạng .csv</p>
                            </div>
                            {importingUsers && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <LoadingSpinner size="sm" text="Đang nhập dữ liệu..." />
                              </div>
                            )}
                          </div>

                          <div className="p-4 bg-white border border-border rounded-xl">
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Lưu ý định dạng file CSV:</p>
                            <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4 font-medium">
                              <li>Cần có các cột: username, password, full_name, role, email (tùy chọn)</li>
                              <li>Role phải là: student, teacher, hoặc admin</li>
                              <li>Tên đăng nhập không được trùng lặp</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Create Content Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-3xl w-full relative overflow-y-auto max-h-[90vh] border border-blue-100"
              >
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-5 mb-10">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                    {activeTab === 'lesson' && <BookOpen className="w-8 h-8" />}
                    {activeTab === 'exercise' && <Target className="w-8 h-8" />}
                    {activeTab === 'test' && <FileText className="w-8 h-8" />}
                    {activeTab === 'classes' && <SchoolIcon className="w-8 h-8" />}
                    {activeTab === 'vocabulary' && <Book className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">
                      {activeTab === 'lesson' && 'Tạo Bài Học Mới'}
                      {activeTab === 'exercise' && 'Tạo Bài Tập Mới'}
                      {activeTab === 'test' && 'Tạo Bài Kiểm Tra'}
                      {/* {activeTab === 'classes' && 'Thiết lập Lớp học Mới'} */}
                      {activeTab === 'vocabulary' && 'Thêm Từ Vựng Mới'}
                    </h3>
                    <p className="text-gray-400 font-medium">Làm phong phú thêm kho tàng tri thức của hệ thống</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  {activeTab === 'classes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tên lớp học</label>
                        <input
                          type="text"
                          placeholder="VD: Lớp 6A1 - Chuyên Toán"
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                          value={formData.name || ''}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Khối lớp</label>
                        <select
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                          value={formData.grade_level || ''}
                          onChange={e => setFormData({ ...formData, grade_level: e.target.value })}
                          required
                        >
                          <option value="">Chọn khối lớp</option>
                          <option value="thcs_6">Lớp 6</option>
                          <option value="thcs_7">Lớp 7</option>
                          <option value="thcs_8">Lớp 8</option>
                          <option value="thcs_9">Lớp 9</option>
                          <option value="thpt_10">Lớp 10</option>
                          <option value="thpt_11">Lớp 11</option>
                          <option value="thpt_12">Lớp 12</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Giờ bắt đầu</label>
                          <input
                            type="time"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={formData.schedule_start || '08:00'}
                            onChange={e => setFormData({ ...formData, schedule_start: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Giờ kết thúc</label>
                          <input
                            type="time"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={formData.schedule_end || '17:00'}
                            onChange={e => setFormData({ ...formData, schedule_end: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">Ngày học trong tuần</label>
                        <div className="flex flex-wrap gap-3">
                          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => {
                            const currentDays = Array.isArray(formData.schedule_days) ? formData.schedule_days : (formData.schedule_days ? JSON.parse(formData.schedule_days) : []);
                            const isSelected = currentDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const newDays = isSelected
                                    ? currentDays.filter((d: string) => d !== day)
                                    : [...currentDays, day];
                                  setFormData({ ...formData, schedule_days: newDays });
                                }}
                                className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${isSelected
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-2 mt-4 p-4 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-rose-600">Giám sát Mạng xã hội</p>
                            <p className="text-[10px] font-bold text-rose-400 uppercase">Tự động chụp ảnh khi học sinh vi phạm</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, social_monitoring_enabled: formData.social_monitoring_enabled ? 0 : 1 })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.social_monitoring_enabled ? 'bg-rose-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.social_monitoring_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeTab === 'lesson' && (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tiêu đề bài học</label>
                          <input
                            type="text"
                            placeholder="VD: Đại số - Chương 1: Số hữu tỉ"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Môn học</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-gray-700"
                            value={formData.subject || ''}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            required
                          >
                            <option value="">Chọn môn học</option>
                            <option value="toan">Toán học</option>
                            <option value="van">Ngữ văn</option>
                            <option value="anh">Tiếng Anh</option>
                            <option value="ly">Vật lý</option>
                            <option value="hoa">Hóa học</option>
                            <option value="sinh">Sinh học</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cấp độ / Lớp</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-gray-700"
                            value={formData.grade_level || ''}
                            onChange={e => setFormData({ ...formData, grade_level: e.target.value })}
                            required
                          >
                            <option value="">Chọn khối lớp</option>
                            <optgroup label="TRUNG HỌC CƠ SỞ">
                              <option value="thcs_6">Lớp 6</option>
                              <option value="thcs_7">Lớp 7</option>
                              <option value="thcs_8">Lớp 8</option>
                              <option value="thcs_9">Lớp 9</option>
                            </optgroup>
                            <optgroup label="TRUNG HỌC PHỔ THÔNG">
                              <option value="thpt_10">Lớp 10</option>
                              <option value="thpt_11">Lớp 11</option>
                              <option value="thpt_12">Lớp 12</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tài liệu đính kèm (PDF, Docx, Image...)</label>
                          <div className="flex flex-wrap items-center gap-4">
                            <input
                              type="file"
                              id="lesson-file"
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  setFile(files[0]);
                                }
                              }}
                            />
                            <label
                              htmlFor="lesson-file"
                              className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold cursor-pointer hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100 shadow-sm"
                            >
                              <Paperclip className="w-4 h-4" />
                              {file ? 'ĐỔI TÀI LIỆU' : 'CHỌN TÀI LIỆU'}
                            </label>
                            {file && (
                              <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setFile(null)}
                                  className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-red-500 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {!file && !!editingItem && editingItem?.file_path && (
                              <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-medium text-emerald-600">Đã có tài liệu: {editingItem.file_path.split('/').pop()}</span>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">Hỗ trợ định dạng PDF, Word, PowerPoint, và các loại hình ảnh.</p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nội dung chi tiết</label>
                          <textarea
                            placeholder="Nhập nội dung bài học..."
                            rows={8}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none font-medium leading-relaxed"
                            value={formData.content || ''}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            required
                          />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Loại tài liệu đi kèm</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-gray-700"
                            value={formData.material_type || ''}
                            onChange={e => setFormData({ ...formData, material_type: e.target.value })}
                          >
                            <option value="">Không có / File tải lên</option>
                            <option value="video">Video (YouTube/Vimeo)</option>
                            <option value="book">Sách điện tử / Website</option>
                          </select>
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Link tài liệu (Nếu có)</label>
                          <input
                            type="text"
                            placeholder="Dán link YouTube hoặc URL sách vào đây..."
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                            value={formData.material_link || ''}
                            onChange={e => setFormData({ ...formData, material_link: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    {(activeTab === 'exercise' || activeTab === 'test') && (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            {activeTab === 'exercise' ? 'Tiêu đề bộ bài tập' : 'Tiêu đề bài kiểm tra'}
                          </label>
                          <input
                            type="text"
                            placeholder={activeTab === 'exercise' ? "VD: Bài tập Cấu tạo Nguyên tử" : "VD: Kiểm tra cuối học kỳ 1 Logic học"}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                            value={formData[activeTab === 'exercise' ? 'title' : 'title'] || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            {activeTab === 'exercise' ? 'Mô tả bộ bài tập' : 'Mô tả bài kiểm tra'}
                          </label>
                          <textarea
                            placeholder={activeTab === 'exercise' ? "Mô tả nội dung luyện tập..." : "Mô tả nội dung bài kiểm tra..."}
                            rows={2}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none font-medium"
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Khối lớp</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={formData.grade_level || ''}
                            onChange={e => setFormData({ ...formData, grade_level: e.target.value })}
                            required
                          >
                            <option value="">Chọn khối lớp</option>
                            <optgroup label="CƠ SỞ & PHỔ THÔNG">
                              <option value="thcs_6">Lớp 6</option>
                              <option value="thcs_7">Lớp 7</option>
                              <option value="thcs_8">Lớp 8</option>
                              <option value="thcs_9">Lớp 9</option>
                              <option value="thpt_10">Lớp 10</option>
                              <option value="thpt_11">Lớp 11</option>
                              <option value="thpt_12">Lớp 12</option>
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Môn học</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            value={formData.subject || ''}
                            required
                          >
                            <option value="">Chọn môn học</option>
                            <option value="toan">Toán học</option>
                            <option value="anh">Tiếng Anh</option>
                            <option value="van">Ngữ văn</option>
                            <option value="vat_ly">Vật lý</option>
                            <option value="hoa_hoc">Hóa học</option>
                            <option value="sinh_hoc">Sinh học</option>
                            <option value="su">Lịch sử</option>
                            <option value="dia">Địa lý</option>
                          </select>
                        </div>


                        {activeTab === 'exercise' && (
                          <>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Bài học liên quan (Tùy chọn)</label>
                            <select
                              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                              onChange={e => {
                                const lessonId = e.target.value;
                                const selectedLesson = lessons.find((l: any) => l.id === Number(lessonId));
                                setFormData({
                                  ...formData,
                                  lesson_id: lessonId || null,
                                  // Auto-set subject/grade if lesson selected
                                  subject: selectedLesson ? selectedLesson.subject : formData.subject,
                                  grade_level: selectedLesson ? selectedLesson.grade_level : formData.grade_level
                                });
                              }}
                              value={formData.lesson_id || ''}
                            >
                              <option value="">--- Không có bài học liên kết ---</option>
                              {lessons.map((lesson: any) => (
                                <option key={lesson.id} value={lesson.id}>{lesson.title} (ID: {lesson.id})</option>
                              ))}
                            </select>
                          </>
                        )}

                        <div className="md:col-span-1">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            {activeTab === 'exercise' ? 'Thời gian (Phút)' : 'Thời gian làm bài (Phút)'}
                          </label>
                          <input
                            type="number"
                            placeholder="VD: 45"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                            value={formData.duration || ''}
                            onChange={e => setFormData({ ...formData, duration: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Giới hạn lượt làm (0 = Không giới hạn)
                          </label>
                          <input
                            type="number"
                            placeholder="VD: 3"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold"
                            value={formData.max_attempts || 0}
                            onChange={e => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 0 })}
                          />
                        </div>

                        {(activeTab === 'test' || activeTab === 'exercise') && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                              Thang điểm (Hệ thống tự chia đều cho các câu hỏi hoặc tự tính tổng)
                            </label>
                            <input
                              type="number"
                              placeholder="VD: 10"
                              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-blue-600"
                              value={formData.total_score || ''}
                              onChange={e => {
                                const newTotal = e.target.value;
                                setFormData({ ...formData, total_score: newTotal });
                                if (questionsList.length > 0 && newTotal) {
                                  const pointsPerQ = Math.round((parseFloat(newTotal) / questionsList.length) * 100) / 100;
                                  setQuestionsList(questionsList.map(q => ({ ...q, points: pointsPerQ })));
                                }
                              }}
                            />
                          </div>
                        )}

                        <div className="md:col-span-2 mt-4 space-y-6">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Book className="w-4 h-4 text-blue-500" />
                                Danh sách câu hỏi ({questionsList.length})
                              </h3>
                              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Xây dựng bộ câu hỏi cho {activeTab === 'exercise' ? 'bài luyện tập' : 'bài kiểm tra'}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const defaultPoints = formData.total_score ? (parseFloat(formData.total_score) / (questionsList.length + 1)) : 10;
                                setQuestionsList([...questionsList, { question: '', options: ['', ''], correct_answer: 'A', points: Math.round(defaultPoints * 100) / 100, type: 'abcd' }]);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
                            >
                              <Plus className="w-4 h-4" /> Thêm câu hỏi
                            </button>
                          </div>

                          <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {questionsList.map((q, qIdx) => (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={qIdx}
                                className="p-6 bg-white border border-gray-200 rounded-3xl shadow-sm hover:border-blue-200 transition-all group relative"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-sm">
                                      {qIdx + 1}
                                    </span>
                                    <select
                                      className="text-[10px] font-black uppercase tracking-widest bg-gray-50 border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer"
                                      value={q.type || 'abcd'}
                                      onChange={(e) => {
                                        const newList = [...questionsList]
                                        newList[qIdx].type = e.target.value
                                        setQuestionsList(newList)
                                      }}
                                    >
                                      <option value="abcd">TRẮC NGHIỆM</option>
                                      <option value="essay">TỰ LUẬN</option>
                                    </select>
                                    <div className="flex items-center gap-2 ml-4">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Điểm:</label>
                                      <input
                                        type="number"
                                        className="w-16 text-[10px] font-black bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 focus:ring-0 focus:border-blue-500"
                                        value={q.points || 0}
                                        onChange={(e) => {
                                          const newList = [...questionsList]
                                          newList[qIdx].points = parseFloat(e.target.value) || 0
                                          setQuestionsList(newList)
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setQuestionsList(questionsList.filter((_, i) => i !== qIdx))}
                                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nội dung câu hỏi</label>
                                    <textarea
                                      rows={2}
                                      placeholder="Nhập câu hỏi tại đây..."
                                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-sm"
                                      value={q.question}
                                      onChange={(e) => {
                                        const newList = [...questionsList]
                                        newList[qIdx].question = e.target.value
                                        setQuestionsList(newList)
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">File nghe (Audio)</label>
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="file"
                                        id={`audio-upload-${qIdx}`}
                                        className="hidden"
                                        accept="audio/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) handleQuestionAudioUpload(qIdx, file)
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => document.getElementById(`audio-upload-${qIdx}`)?.click()}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${q.audio_url ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100'}`}
                                      >
                                        <Headphones className="w-3.5 h-3.5" />
                                        {q.audio_url ? 'Đã có file nghe' : 'Tải lên Audio'}
                                      </button>
                                      {q.audio_url && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newList = [...questionsList]
                                            delete newList[qIdx].audio_url
                                            setQuestionsList(newList)
                                          }}
                                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                          title="Xóa audio"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(q.type === 'abcd' || !q.type) ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Các đáp án</label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newList = [...questionsList]
                                          newList[qIdx].options = [...(newList[qIdx].options || []), '']
                                          setQuestionsList(newList)
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-tight flex items-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Thêm đáp án
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {(q.options || []).map((opt: any, oIdx: number) => (
                                        <div key={oIdx} className="flex items-center gap-2 group/opt">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newList = [...questionsList]
                                              newList[qIdx].correct_answer = String.fromCharCode(65 + oIdx)
                                              setQuestionsList(newList)
                                            }}
                                            className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black transition-all ${q.correct_answer === String.fromCharCode(65 + oIdx) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                          >
                                            {String.fromCharCode(65 + oIdx)}
                                          </button>
                                          <input
                                            type="text"
                                            placeholder={`Đáp án ${String.fromCharCode(65 + oIdx)}`}
                                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                                            value={opt}
                                            onChange={(e) => {
                                              const newList = [...questionsList]
                                              newList[qIdx].options[oIdx] = e.target.value
                                              setQuestionsList(newList)
                                            }}
                                            required
                                          />
                                          {(q.options.length > 2) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newList = [...questionsList]
                                                newList[qIdx].options = newList[qIdx].options.filter((_: any, i: number) => i !== oIdx)
                                                setQuestionsList(newList)
                                              }}
                                              className="w-6 h-6 rounded-lg bg-gray-100 text-gray-400 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-all flex items-center justify-center"
                                            >
                                              <Plus className="w-3 h-3 rotate-45" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                      <p className="text-[10px] text-amber-700 font-black uppercase flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> Chế độ tự luận
                                      </p>
                                      <p className="text-[10px] text-amber-600 mt-1">Học sinh sẽ nhập câu trả lời trực tiếp. Bạn sẽ chấm điểm sau.</p>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Đáp án tham khảo (Dành cho giáo viên)</label>
                                      <textarea
                                        rows={3}
                                        placeholder="Nhập nội dung đáp án chuẩn hoặc gợi ý chấm điểm..."
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-sm"
                                        value={q.correct_answer || ''}
                                        onChange={(e) => {
                                          const newList = [...questionsList]
                                          newList[qIdx].correct_answer = e.target.value
                                          setQuestionsList(newList)
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>

                        {questionsList.length === 0 && (
                          <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                            <Book className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-400 font-bold">Chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu.</p>
                          </div>
                        )}
                      </>
                    )}
                    {activeTab === 'vocabulary' && (
                      <>
                        <div className="md:col-span-2 grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Loại từ vựng</label>
                            <select
                              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-blue-600"
                              onChange={e => setFormData({ ...formData, vocab_type: e.target.value })}
                              value={formData.vocab_type || 'speaking'}
                            >
                              <option value="speaking">Luyện Nói (Speaking)</option>
                              <option value="writing">Luyện Viết (Writing)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Môn học</label>
                            <select
                              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                              onChange={e => setFormData({ ...formData, subject: e.target.value })}
                              value={formData.subject || ''}
                              required
                            >
                              <option value="">Chọn môn học</option>
                              <option value="anh">Tiếng Anh</option>
                              <option value="toan">Toán học</option>
                              <option value="van">Ngữ văn</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Khối lớp</label>
                          <select
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            onChange={e => setFormData({ ...formData, grade_level: e.target.value })}
                            required
                            value={formData.grade_level || ''}
                          >
                            <option value="">Chọn khối lớp</option>
                            <optgroup label="TRUNG HỌC CƠ SỞ">
                              <option value="thcs_6">Lớp 6</option>
                              <option value="thcs_7">Lớp 7</option>
                              <option value="thcs_8">Lớp 8</option>
                              <option value="thcs_9">Lớp 9</option>
                            </optgroup>
                            <optgroup label="TRUNG HỌC PHỔ THÔNG">
                              <option value="thpt_10">Lớp 10</option>
                              <option value="thpt_11">Lớp 11</option>
                              <option value="thpt_12">Lớp 12</option>
                            </optgroup>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          {/* Conditional Inputs based on Type */}
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nội dung từ vựng</label>
                          <div className="grid grid-cols-1 gap-4">
                            <input
                              type="text"
                              placeholder="Từ vựng (Word)"
                              className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-xl text-blue-600"
                              value={formData.word || ''}
                              onChange={e => setFormData({ ...formData, word: e.target.value })}
                              required
                            />

                            {/* Common Inputs for ALL Types: Word, Meaning, IPA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input
                                type="text"
                                placeholder="Nghĩa (Meaning)"
                                className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                value={formData.meaning || ''}
                                onChange={e => setFormData({ ...formData, meaning: e.target.value })}
                                required
                              />
                              <input
                                type="text"
                                placeholder="Phiên âm (IPA) - VD: /həˈləʊ/"
                                className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl italic font-serif"
                                value={formData.pronunciation || ''}
                                onChange={e => setFormData({ ...formData, pronunciation: e.target.value })}
                                required
                              />
                            </div>

                            {/* Additional Context/Example (Always good to have, especially for Reading) */}
                            <textarea
                              rows={2}
                              placeholder="Ví dụ minh họa (Example Context)..."
                              className="px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium"
                              value={formData.example || ''}
                              onChange={e => setFormData({ ...formData, example: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>


                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all"
                    >
                      HỦY BỎ
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? 'ĐANG XỬ LÝ...' : (
                        <>
                          <CheckCircle2 className="w-6 h-6" />
                          HOÀN TẤT & LƯU LẠI
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Content Modal */}
        <AnimatePresence>
          {formData.viewOnly && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              {/* Content for View Content Modal */}
            </motion.div>
          )}
        </AnimatePresence>

        <AnnouncementModal
          isOpen={showAnnouncementModal}
          onClose={() => setShowAnnouncementModal(false)}
          onSubmit={handleCreateAnnouncement}
          formData={announcementFormData}
          setFormData={setAnnouncementFormData}
          loading={loading}
        />

        {/* Detailed Register Modal */}
        <AnimatePresence>
          {
            showRegisterForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]"
                >
                  <button
                    onClick={() => setShowRegisterForm(false)}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">Đăng ký tài khoản mới</h3>
                      <p className="text-gray-400 font-medium">Chọn loại tài khoản và điền thông tin bên dưới</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegisterUser} className="space-y-6">
                    <div className="flex p-1.5 bg-gray-100 rounded-2xl">
                      {['student', 'teacher', 'admin'].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setRegisterFormData({ ...registerFormData, role })}
                          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${registerFormData.role === role ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {role === 'student' ? 'HỌC SINH' : role === 'teacher' ? 'GIÁO VIÊN' : 'QUẢN TRỊ'}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Họ và tên đầy đủ</label>
                        <input
                          type="text"
                          placeholder="VD: Nguyễn Văn A"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                          value={registerFormData.full_name || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, full_name: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Tên đăng nhập</label>
                        <input
                          type="text"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                          value={registerFormData.username || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, username: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Mật khẩu</label>
                        <input
                          type="password"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                          value={registerFormData.password || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, password: e.target.value })}
                          required
                        />
                      </div>

                      {/* Common Fields */}
                      <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Giới tính</label>
                        <select
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none appearance-none"
                          value={registerFormData.gender || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, gender: e.target.value })}
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Email (Tùy chọn)</label>
                        <input
                          type="email"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                          value={registerFormData.email || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Ngày sinh</label>
                        <input
                          type="date"
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                          value={registerFormData.birth_date || ''}
                          onChange={e => setRegisterFormData({ ...registerFormData, birth_date: e.target.value })}
                        />
                      </div>

                      {/* Location & School Fields (Common for all roles now) */}
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-gray-100">
                        <div className="md:col-span-2">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Thông tin địa chỉ & Trường học</p>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Nơi sinh</label>
                          <input
                            type="text"
                            placeholder="VD: Hà Nội"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={registerFormData.place_of_birth || ''}
                            onChange={e => setRegisterFormData({ ...registerFormData, place_of_birth: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Tỉnh/Thành phố</label>
                          <input
                            type="text"
                            placeholder="VD: TP. Hồ Chí Minh"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={registerFormData.province || ''}
                            onChange={e => setRegisterFormData({ ...registerFormData, province: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Quận/Huyện</label>
                          <input
                            type="text"
                            placeholder="VD: Quận 1"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={registerFormData.district || ''}
                            onChange={e => setRegisterFormData({ ...registerFormData, district: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Phường/Xã</label>
                          <input
                            type="text"
                            placeholder="VD: Phường Bến Nghé"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={registerFormData.ward || ''}
                            onChange={e => setRegisterFormData({ ...registerFormData, ward: e.target.value })}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Trường học</label>
                          <input
                            type="text"
                            placeholder="Tên trường học"
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                            value={registerFormData.school || ''}
                            onChange={e => setRegisterFormData({ ...registerFormData, school: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Role Specific Fields */}
                      {registerFormData.role === 'student' && (
                        <>
                          <div className="md:col-span-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Thông tin học tập & Lớp học</p>
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Cấp học</label>
                            <select
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                              value={registerFormData.school_level || ''}
                              onChange={e => setRegisterFormData({ ...registerFormData, school_level: e.target.value, grade_level: '', current_class_id: '' })}
                            >
                              <option value="">Chọn cấp học</option>
                              <option value="tiểu học">Tiểu học (TH)</option>
                              <option value="trung học cơ sở">Trung học cơ sở (THCS)</option>
                              <option value="trung học phổ thông">Trung học phổ thông (THPT)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Khối lớp</label>
                            <select
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                              value={registerFormData.grade_level || ''}
                              onChange={e => setRegisterFormData({ ...registerFormData, grade_level: e.target.value, current_class_id: '' })}
                            >
                              <option value="">Chọn khối lớp</option>
                              {registerFormData.school_level === 'tiểu học' ? (
                                <>
                                  <option value="tieu_hoc_1">Lớp 1</option>
                                  <option value="tieu_hoc_2">Lớp 2</option>
                                  <option value="tieu_hoc_3">Lớp 3</option>
                                  <option value="tieu_hoc_4">Lớp 4</option>
                                  <option value="tieu_hoc_5">Lớp 5</option>
                                </>
                              ) : registerFormData.school_level === 'trung học cơ sở' ? (
                                <>
                                  <option value="thcs_6">Lớp 6</option>
                                  <option value="thcs_7">Lớp 7</option>
                                  <option value="thcs_8">Lớp 8</option>
                                  <option value="thcs_9">Lớp 9</option>
                                </>
                              ) : registerFormData.school_level === 'trung học phổ thông' ? (
                                <>
                                  <option value="thpt_10">Lớp 10</option>
                                  <option value="thpt_11">Lớp 11</option>
                                  <option value="thpt_12">Lớp 12</option>
                                </>
                              ) : null}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Phân vào lớp học chính thức <span className="text-red-500">*</span></label>
                            <select
                              required
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                              value={registerFormData.current_class_id || ''}
                              onChange={e => {
                                const selectedCls = classes.find(c => c.id.toString() === e.target.value);
                                setRegisterFormData({
                                  ...registerFormData,
                                  current_class_id: e.target.value,
                                  class_name: selectedCls ? selectedCls.name : ''
                                });
                              }}
                            >
                              <option value="">-- Chọn lớp học --</option>
                              {classes
                                .filter(c => !registerFormData.grade_level || c.grade_level === registerFormData.grade_level)
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.grade_level?.replace('_', ' ')?.toUpperCase()})
                                  </option>
                                ))}
                            </select>
                            {!registerFormData.grade_level && (
                              <p className="mt-2 text-[10px] text-amber-600 font-bold italic">
                                * Vui lòng chọn khối lớp để rút gọn danh sách lớp học
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {registerFormData.role === 'teacher' && (
                        <>
                          <div className="md:col-span-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Thông tin chuyên môn</p>
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Chuyên môn</label>
                            <input
                              type="text"
                              placeholder="VD: Tiếng Anh, Toán..."
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                              value={registerFormData.specialty || ''}
                              onChange={e => setRegisterFormData({ ...registerFormData, specialty: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Bằng cấp</label>
                            <input
                              type="text"
                              placeholder="VD: Cử nhân, Thạc sĩ..."
                              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                              value={registerFormData.qualification || ''}
                              onChange={e => setRegisterFormData({ ...registerFormData, qualification: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowRegisterForm(false)}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200"
                      >
                        HỦY BỎ
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50"
                      >
                        {loading ? 'ĐANG TẠO...' : 'XÁC NHẬN ĐĂNG KÝ'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )
          }
        </AnimatePresence>

        {/* User Quick View Modal */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl p-0 max-w-md w-full relative overflow-hidden max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="h-28 bg-gradient-to-tr from-blue-600 to-indigo-700 relative">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="px-8 pb-10">
                    <div className="relative -mt-16 mb-6">
                      <div className="w-32 h-32 rounded-3xl bg-white p-1 shadow-2xl mx-auto">
                        <div className="w-full h-full rounded-2xl bg-gray-100 overflow-hidden">
                          <img
                            src={selectedUser.avatar_url ? `${API_URL}${selectedUser.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username}`}
                            alt={selectedUser.username}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedUser.full_name || selectedUser.username}</h3>
                      <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <Settings className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</p>
                            <p className="text-sm font-bold text-gray-800">@{selectedUser.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <UserCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Giới tính</p>
                            <p className="text-sm font-bold text-gray-800">{selectedUser.gender || 'Chưa cập nhật'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <MapIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Địa chỉ</p>
                            <p className="text-sm font-bold text-gray-800 leading-tight">
                              {[selectedUser.ward, selectedUser.district, selectedUser.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nơi sinh</p>
                            <p className="text-sm font-bold text-gray-800">{selectedUser.place_of_birth || 'Chưa cập nhật'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <SchoolIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trường học</p>
                            <p className="text-sm font-bold text-gray-800">{selectedUser.school || 'Chưa cập nhật'}</p>
                          </div>
                        </div>

                        {selectedUser.role === 'student' ? (
                          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lớp / Điểm số</p>
                              <p className="text-sm font-bold text-gray-800 uppercase">
                                {selectedUser.class_name || selectedUser.grade_level?.replace('_', ' ')} • {selectedUser.points} QP
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chuyên môn</p>
                                <p className="text-sm font-bold text-gray-800">{selectedUser.specialty || 'Chưa cập nhật'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trình độ đào tạo</p>
                                <p className="text-sm font-bold text-gray-800">{selectedUser.qualification || 'Chưa cập nhật'}</p>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày sinh</p>
                            <p className="text-sm font-bold text-gray-800">{selectedUser.birth_date ? new Date(selectedUser.birth_date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex gap-3">
                        <button
                          onClick={() => {
                            setEditFormData({ ...selectedUser, current_class_id: selectedUser.class_id })
                            setIsEditingUser(true)
                            setSelectedUser(null)
                          }}
                          className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                        >
                          <Pencil className="w-4 h-4" />
                          CHỈNH SỬA THÔNG TIN
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteUser(selectedUser.id)
                            setSelectedUser(null)
                          }}
                          className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center"
                          title="Xóa người dùng"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit User Modal */}
        <AnimatePresence>
          {isEditingUser && editFormData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Pencil className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">Chỉnh sửa thông tin</h3>
                    <p className="text-gray-400 font-medium">Cập nhật hồ sơ cho @{editFormData.username}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Họ và tên đầy đủ</label>
                      <input
                        type="text"
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                        value={editFormData.full_name || ''}
                        onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Giới tính</label>
                      <select
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                        value={editFormData.gender || ''}
                        onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                      >
                        <option value="">Chọn giới tính</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                        value={editFormData.email || ''}
                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      />
                    </div>

                    {editFormData.role === 'student' && (
                      <>
                        <div className="md:col-span-1">
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Cấp học</label>
                          <select
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                            value={editFormData.school_level || ''}
                            onChange={e => setEditFormData({ ...editFormData, school_level: e.target.value, grade_level: '', school: '', current_class_id: '' })}
                          >
                            <option value="">Chọn cấp học</option>
                            <option value="tiểu học">Tiểu học (TH)</option>
                            <option value="trung học cơ sở">Trung học cơ sở (THCS)</option>
                            <option value="trung học phổ thông">Trung học phổ thông (THPT)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Khối lớp</label>
                          <select
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                            value={editFormData.grade_level || ''}
                            onChange={e => setEditFormData({ ...editFormData, grade_level: e.target.value, current_class_id: '' })}
                          >
                            <option value="">Chọn khối lớp</option>
                            {editFormData.school_level === 'tiểu học' ? (
                              <>
                                <option value="tieu_hoc_1">Lớp 1</option>
                                <option value="tieu_hoc_2">Lớp 2</option>
                                <option value="tieu_hoc_3">Lớp 3</option>
                                <option value="tieu_hoc_4">Lớp 4</option>
                                <option value="tieu_hoc_5">Lớp 5</option>
                              </>
                            ) : editFormData.school_level === 'trung học cơ sở' ? (
                              <>
                                <option value="thcs_6">Lớp 6</option>
                                <option value="thcs_7">Lớp 7</option>
                                <option value="thcs_8">Lớp 8</option>
                                <option value="thcs_9">Lớp 9</option>
                              </>
                            ) : editFormData.school_level === 'trung học phổ thông' ? (
                              <>
                                <option value="thpt_10">Lớp 10</option>
                                <option value="thpt_11">Lớp 11</option>
                                <option value="thpt_12">Lớp 12</option>
                              </>
                            ) : null}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Lớp học chính thức <span className="text-red-500">*</span></label>
                          <select
                            required
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none"
                            value={editFormData.current_class_id || ''}
                            onChange={e => {
                              const selectedCls = classes.find(c => c.id.toString() === e.target.value);
                              setEditFormData({
                                ...editFormData,
                                current_class_id: e.target.value,
                                class_name: selectedCls ? selectedCls.name : ''
                              });
                            }}
                          >
                            <option value="">-- Chọn lớp học --</option>
                            {classes
                              .filter(c => !editFormData.grade_level || c.grade_level === editFormData.grade_level)
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.grade_level?.replace('_', ' ')?.toUpperCase()})
                                </option>
                              ))}
                          </select>
                        </div>
                      </>
                    )}

                    {(editFormData.role === 'teacher' || editFormData.role === 'admin') && (
                      <>
                        {editFormData.role === 'teacher' && (
                          <>
                            <div>
                              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Chuyên môn</label>
                              <input
                                type="text"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                value={editFormData.specialty || ''}
                                onChange={e => setEditFormData({ ...editFormData, specialty: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">Trình độ</label>
                              <input
                                type="text"
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                value={editFormData.qualification || ''}
                                onChange={e => setEditFormData({ ...editFormData, qualification: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditingUser(false)}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200"
                    >
                      HỦY BỎ
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participation Results Modal */}
        <AnimatePresence>
          {showParticipationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-5xl w-full relative overflow-y-auto max-h-[90vh] border border-blue-100"
              >
                <button
                  onClick={() => setShowParticipationModal(false)}
                  className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl text-gray-400"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">Danh sách tham gia</h3>
                      <p className="text-gray-400 font-medium">{selectedResultItem?.title}</p>
                    </div>
                  </div>

                  {/* View Toggle Tabs */}
                  <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60 shadow-inner">
                    <button
                      onClick={() => setResultFilters({ ...resultFilters, type: 'test' })}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${resultFilters.type !== 'violation' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Tham gia
                    </button>
                    <button
                      onClick={() => setResultFilters({ ...resultFilters, type: 'violation' })}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${resultFilters.type === 'violation' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Vi phạm
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lọc theo lớp</label>
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                      value={resultFilters.grade_level || ''}
                      onChange={e => setResultFilters({ ...resultFilters, grade_level: e.target.value })}
                    >
                      <option value="">Tất cả các lớp</option>
                      <option value="thcs_6">Lớp 6</option>
                      <option value="thcs_7">Lớp 7</option>
                      <option value="thcs_8">Lớp 8</option>
                      <option value="thpt_10">Lớp 10</option>
                      <option value="thpt_11">Lớp 11</option>
                      <option value="thpt_12">Lớp 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Từ ngày</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                      onChange={e => setResultFilters({ ...resultFilters, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Đến ngày</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                      onChange={e => setResultFilters({ ...resultFilters, end_date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => handleLoadParticipation(selectedResultItem?.id, resultFilters.type)}
                      className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      ÁP DỤNG BỘ LỌC
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100/50">
                        <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Học sinh</th>
                        {resultFilters.type !== 'violation' ? (
                          <>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Lớp</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Thời gian vào</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Hoàn thành</th>
                            <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] whitespace-nowrap">Trạng thái</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Kết quả</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Nội dung</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Loại vi phạm</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">Thao tác</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {participationResults.map((result, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100 group-hover:scale-105 transition-all">
                                {result.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-slate-900 leading-tight">{result.full_name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{result.username}</p>
                              </div>
                            </div>
                          </td>
                          {resultFilters.type !== 'violation' ? (
                            <>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200/60">
                                  {result.user_grade?.replace('_', ' ') || 'THCS 6'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                                    {result.start_time ? new Date(result.start_time).toLocaleTimeString('vi-VN') : '---'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {result.start_time ? new Date(result.start_time).toLocaleDateString('vi-VN') : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                                    {new Date(result.created_at || result.completed_at).toLocaleTimeString('vi-VN')}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(result.created_at || result.completed_at).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {(() => {
                                  const isOnline = result.last_activity ? (new Date().getTime() - new Date(result.last_activity).getTime() < 120000) : false;
                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                      <span className={`text-[9px] font-black uppercase tracking-tight ${isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {isOnline ? 'Online' : 'Offline'}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black border border-emerald-100/50">
                                    {result.score || result.points || 0}
                                  </span>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ĐIỂM</span>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-600 max-w-[200px] line-clamp-2">
                                  {(() => {
                                    try {
                                      const meta = typeof result.metadata === 'string' ? JSON.parse(result.metadata) : result.metadata;
                                      return meta?.reason || result.item_title || 'Vi phạm bài thi';
                                    } catch (e) {
                                      return result.violation_type || 'Rời khỏi trang làm bài';
                                    }
                                  })()}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${result.violation_type === 'cheat_attempt' ? 'bg-red-50 text-red-600 border-red-100' : (result.violation_type?.includes('AI') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100')}`}>
                                  {result.violation_type === 'cheat_attempt' ? 'VI PHẠM THI' : (result.violation_type?.includes('AI') ? 'CÔNG CỤ AI' : 'HỆ THỐNG')}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleViewSubmission(result)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteParticipation(result.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Xóa lượt làm bài"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right"></td>
                        </tr>
                      ))}
                      {participationResults.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center">
                              <Search className="w-12 h-12 text-slate-200 mb-4" />
                              <p className="text-slate-400 font-bold">Chưa có dữ liệu nào khớp với bộ lọc</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )
          }
        </AnimatePresence>

        {/* Detailed Submission Modal */}
        <AnimatePresence>
          {
            selectedSubmission && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-4xl w-full relative overflow-y-auto max-h-[90vh] border-4 border-white/20"
                >
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="absolute top-8 right-8 p-3 hover:bg-gray-100 rounded-2xl text-gray-400"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <div className="flex items-center gap-6 mb-12">
                    <div className={`w-20 h-20 ${resultFilters.type === 'violation' ? 'bg-red-600' : 'bg-blue-600'} rounded-3xl flex items-center justify-center text-white shadow-xl ${resultFilters.type === 'violation' ? 'shadow-red-500/40' : 'shadow-blue-500/40'} relative`}>
                      <User className="w-10 h-10" />
                      <div className={`absolute -bottom-2 -right-2 w-8 h-8 ${resultFilters.type === 'violation' ? 'bg-red-500' : 'bg-emerald-500'} rounded-xl border-4 border-white flex items-center justify-center`}>
                        {resultFilters.type === 'violation' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-3xl font-black text-slate-900">{selectedSubmission.full_name}</h3>
                        <span className={`px-3 py-1 ${resultFilters.type === 'violation' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'} rounded-xl text-[10px] font-black uppercase tracking-widest border`}>
                          {resultFilters.type === 'violation' ? 'BẰNG CHỨNG VI PHẠM' : 'HỌC SINH'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <p className="text-slate-400 font-bold flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          Lớp {selectedSubmission.user_grade?.replace('_', ' ') || 'THCS 6'}
                        </p>
                        {resultFilters.type !== 'violation' ? (
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm số:</span>
                            <input
                              type="number"
                              value={manualScore}
                              onChange={(e) => setManualScore(Number(e.target.value))}
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-bold text-center text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                              onClick={handleSaveParticipationGrade}
                              disabled={loading}
                              className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                              LƯU ĐIỂM
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100/50">
                            <span className="text-[10px] font-black uppercase tracking-widest">Loại:</span>
                            <span className="text-xs font-black">{selectedSubmission.type === 'cheat_attempt' ? 'Giao diện/Thi cử' : 'AI Detector'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {resultFilters.type === 'violation' ? (
                      <div className="space-y-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-4">Bằng chứng hình ảnh</h4>
                        <div className="relative rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-2xl bg-slate-50">
                          {(selectedSubmission.evidence_url || selectedSubmission.screenshot) ? (
                            <img
                              src={
                                (selectedSubmission.evidence_url || selectedSubmission.screenshot).startsWith('http')
                                  ? (selectedSubmission.evidence_url || selectedSubmission.screenshot)
                                  : `${API_URL}${selectedSubmission.evidence_url || selectedSubmission.screenshot}`
                              }
                              alt="Violation Proof"
                              className="w-full h-auto"
                            />
                          ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                              <ShieldAlert className="w-12 h-12 opacity-20" />
                              <span className="font-bold">Không có ảnh chụp bằng chứng cho bản ghi này</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <p className="text-red-700 font-black text-[10px] uppercase tracking-widest">Nội dung vi phạm</p>
                          </div>
                          <p className="text-red-600 font-bold text-sm leading-relaxed">
                            {(() => {
                              try {
                                const meta = typeof selectedSubmission.metadata === 'string' ? JSON.parse(selectedSubmission.metadata) : selectedSubmission.metadata;
                                return meta?.reason || selectedSubmission.violation_type || 'Phát hiện hành vi rời khỏi trang làm bài';
                              } catch (e) {
                                return selectedSubmission.violation_type || 'Vi phạm được ghi nhận';
                              }
                            })()}
                          </p>
                          <div className="mt-4 pt-4 border-t border-red-100/50 flex justify-between items-center">
                            <span className="text-slate-400 text-[10px] font-black uppercase">Thời điểm ghi nhận:</span>
                            <span className="text-slate-600 text-[10px] font-bold">
                              {new Date(selectedSubmission.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-4">Chi tiết đáp án</h4>

                        {(() => {
                          try {
                            const studentAnswers = JSON.parse(selectedSubmission.answers || '[]');
                            if (!studentAnswers || studentAnswers.length === 0) {
                              return <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-slate-100">Hệ thống chưa lưu dữ liệu chi tiết đáp án của học sinh này</div>
                            }

                            return (
                              <div className="space-y-6">
                                {studentAnswers.map((ans: any, idx: number) => {
                                  const question = selectedResultItem?.questions?.[idx]
                                  const isEssay = question?.type === 'essay'
                                  return (
                                    <div key={idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                      <div className="flex justify-between items-start mb-4">
                                        <h5 className="font-bold text-slate-800 leading-tight">
                                          Câu {idx + 1}: <span className="text-slate-600 font-medium">{question?.question || '---'}</span>
                                        </h5>
                                        <div className="flex gap-2">
                                          {isEssay && (
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[9px] font-black uppercase tracking-widest">
                                              TỰ LUẬN
                                            </span>
                                          )}
                                          {!isEssay && question && (
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${ans === question.correct_answer ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                              {ans === question.correct_answer ? 'CHÍNH XÁC' : 'SAI'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className={`p-5 rounded-2xl border shadow-inner transition-all ${!isEssay && question ? (ans === question.correct_answer ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100') : 'bg-white border-slate-200'}`}>
                                        <div className="flex flex-col gap-2">
                                          <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${!isEssay && question ? (ans === question.correct_answer ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-400'}`}>Học sinh đã trả lời:</p>
                                          <div className={`font-bold whitespace-pre-wrap ${isEssay ? 'text-lg leading-relaxed text-slate-800' : 'text-sm'} ${!isEssay && question ? (ans === question.correct_answer ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-800'}`}>
                                            {ans || <span className="text-slate-300 italic font-medium">(Bỏ trống)</span>}
                                          </div>

                                          {!isEssay && question && ans !== question.correct_answer && (
                                            <div className="mt-4 pt-4 border-t border-rose-100 flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                                <CheckCircle2 className="w-4 h-4" />
                                              </div>
                                              <div>
                                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest leading-none mb-1">Đáp án đúng:</p>
                                                <p className="text-sm font-bold text-emerald-700">{question.correct_answer}</p>
                                              </div>
                                            </div>
                                          )}
                                          {isEssay && question?.correct_answer && (
                                            <div className="mt-4 pt-4 border-t border-blue-100 flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                                                <Info className="w-4 h-4" />
                                              </div>
                                              <div>
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest leading-none mb-1">Đáp án tham khảo:</p>
                                                <p className="text-sm font-bold text-blue-700 whitespace-pre-wrap">{question.correct_answer}</p>
                                              </div>
                                            </div>
                                          )}
                                          <div className="mt-2 flex justify-end">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                              Giá trị: {question?.points || 0} điểm
                                            </span>
                                          </div>
                                          {selectedSubmission.file_url && idx === 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                              <a
                                                href={selectedSubmission.file_url.startsWith('http') ? selectedSubmission.file_url : `${API_URL}${selectedSubmission.file_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] hover:bg-emerald-100 transition-all border border-emerald-100"
                                              >
                                                <FileUp className="w-4 h-4" />
                                                XEM TỆP ĐÍNH KÈM
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          } catch (e) {
                            return <div className="p-8 text-center text-red-400 font-bold bg-red-50 rounded-3xl border border-red-100">Lỗi dữ liệu đáp án: Không tìm thấy hoặc định dạng sai</div>
                          }
                        })()}
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )
          }
        </AnimatePresence>

        {/* Class Creation/Edit Modal */}
        <AnimatePresence>
          {showClassModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 max-w-lg w-full relative"
              >
                <button
                  onClick={() => setShowClassModal(false)}
                  className="absolute top-8 right-8 p-3 hover:bg-muted rounded-2xl text-muted-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <SchoolIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground">{selectedClass ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}</h3>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Hệ thống quản lý EDU SMART NOITRU</p>
                  </div>
                </div>

                <form onSubmit={handleCreateOrUpdateClass} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tên lớp (Ví dụ: 9A1)</label>
                    <input
                      required
                      type="text"
                      className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl font-bold uppercase focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="Nhập tên lớp..."
                      value={classFormData.name}
                      onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Khối lớp</label>
                      <select
                        required
                        className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={classFormData.grade_level}
                        onChange={(e) => setClassFormData({ ...classFormData, grade_level: e.target.value })}
                      >
                        <option value="tieu_hoc_1">Lớp 1</option>
                        <option value="tieu_hoc_2">Lớp 2</option>
                        <option value="tieu_hoc_3">Lớp 3</option>
                        <option value="tieu_hoc_4">Lớp 4</option>
                        <option value="tieu_hoc_5">Lớp 5</option>
                        <option value="thcs_6">Lớp 6</option>
                        <option value="thcs_7">Lớp 7</option>
                        <option value="thcs_8">Lớp 8</option>
                        <option value="thcs_9">Lớp 9</option>
                        <option value="thpt_10">Lớp 10</option>
                        <option value="thpt_11">Lớp 11</option>
                        <option value="thpt_12">Lớp 12</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Giáo viên chủ nhiệm</label>
                      <select
                        required
                        className="w-full px-5 py-3.5 bg-muted border border-border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={classFormData.teacher_id}
                        onChange={(e) => setClassFormData({ ...classFormData, teacher_id: e.target.value })}
                      >
                        <option value={user.id}>Chính tôi ({user.full_name})</option>
                        {allUsers.filter(u => (u.role === 'teacher' || u.role === 'admin') && u.id !== user.id).map(t => (
                          <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowClassModal(false)}
                      className="flex-1 py-4 px-6 bg-muted text-muted-foreground font-black rounded-2xl hover:bg-accent transition-all uppercase tracking-widest text-xs"
                    >
                      HỦY
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-4 px-6 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50"
                    >
                      {loading ? 'ĐANG LƯU...' : (selectedClass ? 'CẬP NHẬT' : 'KHỞI TẠO LỚP')}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Class Students View Modal */}
        <AnimatePresence>
          {showClassStudentsView && selectedClass && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-card border border-border rounded-[3rem] shadow-2xl p-10 max-w-4xl w-full relative max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Users className="w-32 h-32" />
                </div>

                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-foreground">Học sinh lớp {selectedClass.name}</h3>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Sĩ số hiện tại: {Array.isArray(classStudents) ? classStudents.length : 0} học sinh</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClassStudentsView(false)}
                    className="p-3 hover:bg-muted rounded-2xl text-muted-foreground transition-colors border border-border"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.isArray(classStudents) && classStudents.map((student) => (
                      <div key={student.id} className="p-5 bg-muted/40 rounded-2xl border border-border flex items-center gap-4 group hover:bg-muted/60 transition-all">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center font-bold text-blue-600">
                          {student.avatar_url ? (
                            <img src={`${API_URL}${student.avatar_url}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            student.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{student.full_name || student.username}</p>
                          <p className="text-xs text-muted-foreground font-mono">@{student.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-600 font-black text-lg">{student.points || 0}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">ĐIỂM</p>
                        </div>
                      </div>
                    ))}

                    {classStudents.length === 0 && (
                      <div className="col-span-full py-16 text-center text-muted-foreground">
                        <p className="font-bold uppercase tracking-widest italic opacity-50">Lớp học hiện tại chưa có học sinh nào</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-border flex justify-end">
                  <button
                    onClick={() => setShowClassStudentsView(false)}
                    className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all text-sm uppercase tracking-widest"
                  >
                    ĐÓNG CỬA SỔ
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Zoom Modal */}
        <AnimatePresence>
          {zoomedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 cursor-zoom-out"
              onClick={() => setZoomedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="relative max-w-5xl w-full h-full flex items-center justify-center px-10 py-10"
              >
                <img
                  src={zoomedImage}
                  alt="Evidence"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border-4 border-white/10"
                />
                <button
                  onClick={() => setZoomedImage(null)}
                  className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all border border-white/20"
                >
                  <X className="w-8 h-8" />
                </button>
              </motion.div>
            </motion.div>
          )
          }
        </AnimatePresence>
        {/* Confirmation Modal */}
        <AnimatePresence>
          {
            confirmationModal?.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-card rounded-[2rem] shadow-2xl p-8 max-w-sm w-full border border-border"
                >
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 mx-auto">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">{confirmationModal.title}</h3>
                  <p className="text-muted-foreground text-center mb-8">{confirmationModal.message}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
                      className="flex-1 py-3 bg-muted hover:bg-accent rounded-xl font-bold transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        confirmationModal.onConfirm()
                        setConfirmationModal({ ...confirmationModal, isOpen: false })
                      }}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                    >
                      Xác nhận
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )
          }
        </AnimatePresence>

        {/* Grade Entry Modal */}
        <AnimatePresence>
          {isGradeModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-card border border-border rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full relative"
              >
                <button
                  onClick={() => setIsGradeModalOpen(false)}
                  className="absolute top-8 right-8 p-3 hover:bg-muted rounded-2xl text-muted-foreground transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-5 mb-10">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Pencil className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground">
                      {currentGradeForm.id ? 'Sửa điểm số' : 'Nhập điểm mới'}
                    </h3>
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-0.5">Môn {gradeFilters.subject.toUpperCase()} • HK {gradeFilters.semester}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveGrade} className="space-y-6">
                  {!currentGradeForm.id && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Học sinh mục tiêu</label>
                      <select
                        className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm appearance-none"
                        value={currentGradeForm.student_id}
                        onChange={e => setCurrentGradeForm({ ...currentGradeForm, student_id: parseInt(e.target.value) })}
                        required
                      >
                        <option value="">-- Chọn học sinh --</option>
                        {gradeClassStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} (@{s.username})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Loại điểm</label>
                      <select
                        className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm appearance-none disabled:opacity-50"
                        value={currentGradeForm.grade_type}
                        onChange={e => setCurrentGradeForm({ ...currentGradeForm, grade_type: e.target.value })}
                        disabled={!!currentGradeForm.id}
                        required
                      >
                        <option value="oral">Miệng</option>
                        <option value="quiz_15">15 Phút</option>
                        <option value="test_45">45 Phút</option>
                        <option value="midterm">Giữa kỳ</option>
                        <option value="final">Cuối kỳ</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Điểm (0-10)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="0.0"
                        className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                        value={currentGradeForm.score}
                        onChange={e => setCurrentGradeForm({ ...currentGradeForm, score: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Học kỳ</label>
                      <select
                        className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm appearance-none"
                        value={currentGradeForm.semester}
                        onChange={e => setCurrentGradeForm({ ...currentGradeForm, semester: parseInt(e.target.value) })}
                        required
                      >
                        <option value={1}>Học kỳ I</option>
                        <option value={2}>Học kỳ II</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Year</label>
                      <input
                        type="text"
                        placeholder="2025-2026"
                        className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm"
                        value={currentGradeForm.year}
                        onChange={e => setCurrentGradeForm({ ...currentGradeForm, year: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">Ghi chú nội bộ</label>
                    <textarea
                      className="w-full px-6 py-4 bg-muted border border-border rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[120px] text-sm"
                      value={currentGradeForm.note || ''}
                      onChange={e => setCurrentGradeForm({ ...currentGradeForm, note: e.target.value })}
                      placeholder="Nhận xét về bài làm của học sinh..."
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-[0.98] uppercase tracking-widest"
                    >
                      {isSubmitting ? 'ĐANG XỬ LÝ...' : (currentGradeForm.id ? 'CẬP NHẬT ĐIỂM' : 'LƯU VÀO HỆ THỐNG')}
                    </button>

                    {currentGradeForm.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGrade(currentGradeForm.id)}
                        className="w-full py-4 text-red-500 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors uppercase tracking-widest"
                      >
                        Xóa bản ghi điểm này
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsGradeModalOpen(false)}
                      className="w-full py-4 text-muted-foreground font-bold text-xs hover:bg-muted rounded-xl transition-colors uppercase tracking-widest"
                    >
                      Đóng cửa sổ
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <ChatbotWidget />
    </div>
  )
}

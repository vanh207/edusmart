'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Trophy,
  Target,
  ArrowRight,
  User,
  LogOut,
  TrendingUp,
  Award,
  Book,
  FileText,
  ClipboardList,
  ChevronRight,
  Star,
  Mic,
  Search,
  Zap,
  Clock,
  LayoutDashboard,
  Settings,
  Bell,
  Sparkles,
  GraduationCap,
  Flame,
  MessageSquare,
  BarChart3
} from 'lucide-react'
import api, { userAPI, leaderboardAPI, lessonsAPI, exercisesAPI, API_URL } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'
import NotificationBell from '@/components/NotificationBell'
import StudentStatusHeader from '@/components/StudentStatusHeader'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useToast } from '@/context/ToastContext'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [newestLessons, setNewestLessons] = useState<any[]>([])
  const [newestExercises, setNewestExercises] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [radarData, setRadarData] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackData, setFeedbackData] = useState({ subject: '', message: '' })
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const fetchData = async () => {
      try {
        const [profileRes, progressRes, lessonsRes, exercisesRes] = await Promise.all([
          userAPI.getProfile(),
          userAPI.getProgress(),
          lessonsAPI.getAll({}),
          exercisesAPI.getAll({})
        ])

        const userData = profileRes.data
        if (userData.role === 'admin' || userData.role === 'teacher') {
          router.push('/admin/dashboard')
          return
        }

        setUser(userData)
        setProgress(progressRes.data)
        setNewestLessons(lessonsRes.data.slice(0, 3))
        setNewestExercises(exercisesRes.data.slice(0, 3))
        sessionStorage.setItem('user', JSON.stringify(userData))

        // Fetch Analytics
        const [radarRes, weeklyRes] = await Promise.all([
          api.get('/user/analytics/radar'),
          api.get('/user/analytics/weekly')
        ])
        setRadarData(radarRes.data)
        setWeeklyData(weeklyRes.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const loadLeaderboardData = async () => {
    try {
      const res = await leaderboardAPI.get()
      setLeaderboard(res.data)
    } catch (err) {
      console.error('Failed to load leaderboard', err)
    }
  }

  useEffect(() => {
    if (activeTab === 'rank') {
      loadLeaderboardData()
    }
  }, [activeTab])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" text="Đang chuẩn bị lộ trình học tập..." />
      </div>
    )
  }

  const quickActions = [
    { href: '/lessons', icon: BookOpen, title: 'Bài học SGK', color: 'bg-blue-500' },
    { href: '/practice', icon: Target, title: 'Luyện tập', color: 'bg-purple-500' },
    { href: '/vocabulary', icon: Book, title: 'Từ vựng', color: 'bg-orange-500' },
    { href: '/tests', icon: ClipboardList, title: 'Kiểm tra', color: 'bg-red-500' },
    { href: '/student/grades', icon: BarChart3, title: 'Bảng điểm', color: 'bg-green-500' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  const stats = {
    completedLessons: progress.filter(item => item.completed).length,
    totalPoints: user?.points || 0,
    totalStudyTime: Math.round(progress.reduce((acc, curr) => acc + (curr.total_study_time || 0), 0) / 60),
    accuracy: progress.length > 0
      ? Math.round((progress.reduce((acc, curr) => acc + (curr.completed_exercises || 0), 0) /
        progress.reduce((acc, curr) => acc + (Math.max(curr.total_exercises, 1)), 0)) * 100)
      : 0
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans transition-colors duration-300">
      {/* Mini Sidebar / Nav */}
      <aside className="w-20 lg:w-24 bg-card border-r border-border flex flex-col items-center py-8 gap-10 sticky h-screen top-0 z-20">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <GraduationCap className="text-white w-7 h-7" />
        </div>

        <nav className="flex flex-col gap-6 flex-1">
          {[
            { icon: LayoutDashboard, id: 'overview' },
            { icon: Trophy, id: 'rank' },
            { icon: Book, id: 'smart-notes' },
            { icon: Mic, id: 'ai-speaking' },
            { icon: MessageSquare, id: 'feedback' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'smart-notes') router.push('/smart-notes');
                else if (item.id === 'ai-speaking') router.push('/ai-speaking');
                else if (item.id === 'feedback') setShowFeedbackModal(true);
                else setActiveTab(item.id);
              }}
              className={`p-4 rounded-2xl transition-all group ${activeTab === item.id ? 'bg-blue-50 text-blue-600 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
              <item.icon className="w-6 h-6 transition-transform group-hover:scale-110" />
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="p-4 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </aside>

      <main className="flex-1 lg:p-10 p-6 overflow-x-hidden">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Học tập thông minh ⚡
            </h1>
            <p className="text-muted-foreground font-medium">Chào mừng trở lại, {user?.full_name || user?.username}</p>
          </div>

          <div className="flex items-center gap-6">
            <ThemeToggle />

            <div className="hidden md:flex bg-card px-4 py-2 rounded-2xl border border-border items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                {user?.points || 0}
              </div>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Points</span>
            </div>

            <div className="hidden md:flex bg-card px-4 py-2 rounded-2xl border border-border items-center gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-tight leading-none">STREAK</span>
                <span className="text-sm font-bold text-muted-foreground leading-none mt-0.5">{user?.study_streak || 0} ngày</span>
              </div>
            </div>

            <StudentStatusHeader />

            <NotificationBell />

            <Link href="/profile" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 border-2 border-white shadow-md overflow-hidden relative transition-transform group-hover:scale-105">
                <img
                  src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
          </div>
        </header>

        {/* Grade Level Warning */}
        <AnimatePresence>
          {!user?.grade_level && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-sm">
                <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Star className="w-8 h-8 fill-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-lg font-black text-amber-800 tracking-tight">Cập nhật khối lớp ngay!</h4>
                  <p className="text-amber-700 font-medium opacity-80">Vui lòng cập nhật khối lớp trong hồ sơ để nhận được nội dung học tập phù hợp nhất cho bạn.</p>
                </div>
                <Link
                  href="/profile"
                  className="px-8 py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition-all shadow-md active:scale-95 whitespace-nowrap"
                >
                  Cập nhật hồ sơ
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        {/* Main Dashboard Content */}
        {activeTab === 'overview' && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-[2.5rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-10 lg:p-16 text-white overflow-hidden mb-12 shadow-2xl shadow-slate-900/20"
            >
              {/* Abstract background shapes */}
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/20 to-transparent"></div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
              <div className="absolute top-10 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl animate-pulse"></div>

              <div className="relative z-10 lg:w-2/3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-black uppercase tracking-[0.2em] mb-6">
                  <Sparkles className="w-3.5 h-3.5" /> Chinh phục kiến thức mới
                </div>
                <h2 className="text-4xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                  Lập kế hoạch <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Kết quả phi thường.</span>
                </h2>
                <p className="text-slate-400 text-lg mb-10 max-w-lg font-medium leading-relaxed">
                  Hệ thống học tập cá nhân hóa sử dụng AI giúp bạn nắm bắt kiến thức nhanh hơn 3x lần. Bắt đầu ngay hôm nay!
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/lessons')}
                    className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
                  >
                    HỌC NGAY <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => router.push('/learning-paths')}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-white/20 transition-all active:scale-95"
                  >
                    LỘ TRÌNH
                  </button>
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
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-white rounded-3xl p-4 shadow-xl rotate-12">
                      <Zap className="w-full h-full text-amber-500" />
                    </div>
                    <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Tỉ lệ chính xác</p>
                    <p className="text-4xl font-black text-white">{stats.accuracy}%</p>
                    <p className="text-sm text-slate-300 font-medium">Dựa trên các bài tập đã làm</p>
                  </motion.div>
                </div>
              </div>
            </motion.section>

            {/* Quick Access Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
            >
              {quickActions.map((action, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }}>
                  <Link href={action.href}>
                    <div className="bg-card p-6 rounded-[2.5rem] border border-border shadow-md hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-center h-full flex flex-col items-center justify-center group cursor-pointer relative overflow-hidden">
                      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${action.color.replace('bg-', 'from-')}/10 to-transparent rounded-full -mr-10 -mt-10 blur-xl transition-all group-hover:scale-150`}></div>
                      <div className={`w-16 h-16 rounded-2xl ${action.color} text-white flex items-center justify-center mb-4 shadow-xl transition-transform group-hover:rotate-12 ${action.color === 'bg-blue-500' ? 'shadow-blue-500/20' :
                        action.color === 'bg-purple-500' ? 'shadow-purple-500/20' :
                          action.color === 'bg-orange-500' ? 'shadow-orange-500/20' :
                            'shadow-red-500/20'
                        }`}>
                        <action.icon className="w-8 h-8" />
                      </div>
                      <h3 className="font-black text-foreground tracking-tight group-hover:text-blue-600 transition-colors uppercase text-xs tracking-[0.1em]">{action.title}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Recent Lessons */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    Tiến độ học tập của bạn
                  </h3>
                  <Link href="/lessons" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    Tất cả <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {progress.length > 0 ? progress.slice(0, 4).map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ x: 5 }}
                      className="bg-card p-5 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:border-blue-200 transition-all cursor-pointer"
                      onClick={() => router.push(`/lessons/${item.lesson_id}`)}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-blue-500 transition-colors">
                        <BookOpen className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{(item.subject || 'Chung')} • {(item.grade_level || 'Lớp ?')?.replace('_', ' ')}</p>
                        <h4 className="font-bold text-foreground truncate">{item.lesson_title || 'Bài học không tên'}</h4>
                        <div className="mt-2 w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${(item.completed_exercises / (item.total_exercises || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-2 py-10 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
                      <p className="text-slate-400 font-medium">Bắt đầu học bài đầu tiên để xem tiến độ tại đây!</p>
                    </div>
                  )}
                </div>

                {/* New Content Section */}
                <div className="mt-12">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">
                      <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                      Khám phá nội dung mới 🆕
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...newestLessons, ...newestExercises].length > 0 ? (
                      [...newestLessons.map(l => ({ ...l, type: 'lesson' })), ...newestExercises.map(e => ({ ...e, type: 'exercise' }))]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 6)
                        .map((item, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            className="bg-card p-5 rounded-3xl border border-border shadow-sm flex items-center gap-5 hover:border-purple-200 transition-all cursor-pointer"
                            onClick={() => router.push(item.type === 'lesson' ? `/lessons/${item.id}` : `/practice/${item.id}`)}
                          >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.type === 'lesson' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {item.type === 'lesson' ? <BookOpen className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${item.type === 'lesson' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {item.type === 'lesson' ? 'Bài học' : 'Luyện tập'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {(item.grade_level || 'Lớp ?')?.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="font-bold text-foreground truncate text-sm">{item.title}</h4>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300" />
                          </motion.div>
                        ))
                    ) : (
                      <div className="col-span-2 py-10 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
                        <p className="text-slate-400 font-medium">Đang cập nhật nội dung mới nhất...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats / Right Panel */}
              <div className="space-y-8">
                {/* Radar Chart */}
                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
                  <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Bản đồ Năng lực
                  </h3>
                  <div className="h-64 w-full">
                    {radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                          <Radar
                            name="Năng lực"
                            dataKey="A"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.5}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-medium text-center px-4">
                        Hoàn thành thêm bài tập để xem phân tích năng lực.
                      </div>
                    )}
                  </div>
                </div>

                {/* Weekly Report Chart */}
                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
                  <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Phong độ học tập
                  </h3>
                  <div className="h-48 w-full">
                    {weeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="day"
                            tick={{ fontSize: 9, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avg_score"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10b981' }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-medium">
                        Chưa có dữ liệu tuần này.
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm">
                  <h3 className="text-lg font-black text-foreground mb-6">Thống kê chung</h3>
                  <div className="space-y-6">
                    {/* ... Existing stats items ... */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500 shadow-sm shadow-amber-200/50">
                        <Trophy className="w-6 h-6 fill-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Bài học đã xong</p>
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.completedLessons}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 shadow-sm shadow-indigo-200/50">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Thời gian học (Phút)</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalStudyTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-50 flex items-center justify-center text-blue-500 shadow-sm shadow-blue-200/50">
                        <Target className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Tỉ lệ chính xác</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.accuracy}%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-200/50">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-foreground uppercase tracking-widest leading-none mb-1">Tổng điểm tích lũy</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalPoints}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                  <h3 className="text-lg font-bold mb-4">Giáo viên AI Giao tiếp</h3>
                  <p className="text-blue-100 text-sm mb-6 leading-relaxed opacity-90">Trò chuyện trực tiếp và nhận phản hồi sửa lỗi từ giáo viên AI EduSmart Noitru.</p>
                  <button
                    onClick={() => router.push('/ai-speaking')}
                    className="w-full py-3 bg-white text-indigo-700 font-black rounded-2xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    BẮT ĐẦU LUYỆN NÓI <Mic className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 relative overflow-hidden group">
                  <Sparkles className="absolute -right-2 -top-2 w-16 h-16 text-blue-200 opacity-50 transition-transform group-hover:rotate-45" />
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 relative z-10">Mẹo thông minh</p>
                  <p className="text-sm text-blue-800 font-medium leading-relaxed relative z-10">
                    Sử dụng <strong>Chatbot AI</strong> bên dưới nếu bạn gặp khó khăn trong khi giải bài tập nhé!
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'rank' && (
          <div className="max-w-4xl mx-auto py-8">
            <div className="bg-card p-10 rounded-[3rem] border border-border shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                <Trophy className="w-40 h-40 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-black text-foreground mb-2">Bảng Xếp Hạng</h2>
                <p className="text-muted-foreground font-medium mb-10">Cỗ vũ tinh thần học tập và vươn tới đỉnh cao!</p>

                <div className="space-y-4">
                  {leaderboard.map((u, idx) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-6 p-6 rounded-[2rem] border transition-all ${u.id === user?.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-500/10' : 'bg-card border-border'}`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : idx === 1 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'text-slate-300 dark:text-slate-700'}`}>
                        {idx + 1}
                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-muted border-4 border-card shadow-md overflow-hidden flex-shrink-0">
                        <img
                          src={u.avatar_url ? `${API_URL}${u.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                          alt={u.username}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-foreground text-lg flex items-center gap-2">
                          {u.full_name || u.username}
                          {u.id === user?.id && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Bạn</span>}
                        </h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{u.grade_level?.replace('_', ' ')}</span>
                          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-sm">
                            <Flame className="w-4 h-4" />
                            {u.study_streak || 0} ngày
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{u.total_points}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Points</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <ChatbotWidget />

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-md rounded-3xl shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
                  <LogOut className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-4">Xác nhận đăng xuất</h3>
                <p className="text-muted-foreground font-medium mb-8">
                  Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-foreground bg-accent hover:bg-accent/80 transition-all uppercase tracking-widest text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all uppercase tracking-widest text-sm"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-border"
            >
              <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <h3 className="text-2xl font-black mb-1">Gửi phản hồi hệ thống</h3>
                <p className="text-blue-100 text-sm font-medium">Ý kiến của bạn giúp chúng tôi hoàn thiện hơn mỗi ngày.</p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmittingFeedback(true);
                  try {
                    await userAPI.submitFeedback(feedbackData);
                    toast('Đã gửi phản hồi thành công!', 'success');
                    setShowFeedbackModal(false);
                    setFeedbackData({ subject: '', message: '' });
                  } catch (err) {
                    toast('Không thể gửi phản hồi', 'error');
                  } finally {
                    setIsSubmittingFeedback(false);
                  }
                }}
                className="p-8 space-y-6"
              >
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Chủ đề</label>
                  <input
                    type="text"
                    required
                    value={feedbackData.subject}
                    onChange={e => setFeedbackData({ ...feedbackData, subject: e.target.value })}
                    placeholder="VD: Góp ý tính năng, Báo lỗi..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 border border-slate-100 dark:border-slate-700 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-2">Nội dung chi tiết</label>
                  <textarea
                    required
                    rows={4}
                    value={feedbackData.message}
                    onChange={e => setFeedbackData({ ...feedbackData, message: e.target.value })}
                    placeholder="Hãy mô tả chi tiết góp ý hoặc vấn đề của bạn..."
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 border border-slate-100 dark:border-slate-700 transition-all font-medium"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmittingFeedback ? 'Đang gửi...' : 'Gửi phản hồi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

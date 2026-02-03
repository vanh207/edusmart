'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    BarChart3,
    Users,
    School,
    MessageSquare,
    Plus,
    LogOut,
    Search,
    CheckCircle2,
    AlertCircle,
    LayoutDashboard,
    Shield,
    Building2,
    ChevronRight,
    TrendingUp,
    MapPin,
    Settings,
    Trash2,
    UserPlus
} from 'lucide-react'
import { superAdminAPI, userAPI, adminAPI } from '@/lib/api'
import { useToast } from '@/context/ToastContext'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import ConfirmationModal from '@/components/ConfirmationModal'

export default function SuperAdminDashboard() {
    const router = useRouter()
    const { toast } = useToast()
    const [user, setUser] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'feedback'>('overview')
    const [stats, setStats] = useState<any>(null)
    const [schools, setSchools] = useState<any[]>([])
    const [feedback, setFeedback] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showSchoolModal, setShowSchoolModal] = useState(false)
    const [showAdminModal, setShowAdminModal] = useState(false)
    const [selectedSchool, setSelectedSchool] = useState<any>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
    const [showAnalysisModal, setShowAnalysisModal] = useState(false)
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean
        type: 'logout' | 'delete_school' | 'cleanup'
        title: string
        message: string
        confirmText: string
        onConfirm: () => void
        variant: 'danger' | 'warning' | 'info'
    }>({
        isOpen: false,
        type: 'logout',
        title: '',
        message: '',
        confirmText: '',
        onConfirm: () => { },
        variant: 'danger'
    })
    const [schoolFormData, setSchoolFormData] = useState({
        name: '',
        levels: 'thcs,thpt',
        province: '',
        district: '',
        address: ''
    })
    const [adminFormData, setAdminFormData] = useState({
        username: '',
        password: '',
        full_name: '',
        email: '',
        role: 'admin'
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profileRes = await userAPI.getProfile()
                if (profileRes.data.is_super_admin !== 1) {
                    router.push('/login/admin')
                    return
                }
                setUser(profileRes.data)

                const [statsRes, schoolsRes, feedbackRes] = await Promise.all([
                    superAdminAPI.getStats(),
                    superAdminAPI.getSchools(),
                    superAdminAPI.getFeedback()
                ])

                setStats(statsRes.data)
                setSchools(schoolsRes.data)
                setFeedback(feedbackRes.data)
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
                toast('Không thể tải dữ liệu dashboard', 'error')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [router, toast])

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await superAdminAPI.createSchool(schoolFormData)
            toast('Tạo trường học mới thành công', 'success')
            setShowSchoolModal(false)
            setSchoolFormData({ name: '', levels: 'thcs,thpt', province: '', district: '', address: '' })
            refreshData()
        } catch (error: any) {
            toast(error.response?.data?.error || 'Lỗi khi tạo trường học', 'error')
        }
    }

    const handleDeleteSchool = (id: number) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete_school',
            title: 'Xác nhận xóa trường',
            message: 'Bạn có chắc chắn muốn xóa trường học này? Tất cả dữ liệu liên quan sẽ bị loại khỏi hệ thống.',
            confirmText: 'XÓA TRƯỜNG',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await superAdminAPI.deleteSchool(id)
                    toast('Đã xóa trường học', 'success')
                    refreshData()
                } catch (error) {
                    toast('Lỗi khi xóa trường học', 'error')
                }
            }
        })
    }

    const handleCleanupSchools = () => {
        setConfirmModal({
            isOpen: true,
            type: 'cleanup',
            title: 'Dọn dẹp hệ thống',
            message: 'CẢNH BÁO: Hành động này sẽ xóa TẤT CẢ các trường học trong hệ thống. Bạn có chắc chắn muốn tiếp tục?',
            confirmText: 'XÓA TẤT CẢ',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await superAdminAPI.cleanupSchools()
                    toast('Đã dọn dẹp tất cả các trường học', 'success')
                    refreshData()
                } catch (error) {
                    toast('Lỗi khi dọn dẹp hệ thống', 'error')
                }
            }
        })
    }

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await adminAPI.registerUser({ ...adminFormData, school_id: selectedSchool.id, school: selectedSchool.name })
            toast(`Đã tạo tài khoản quản trị cho ${selectedSchool.name}`, 'success')
            setShowAdminModal(false)
            setAdminFormData({ username: '', password: '', full_name: '', email: '', role: 'admin' })
            refreshData()
        } catch (error: any) {
            toast(error.response?.data?.error || 'Lỗi khi tạo tài khoản', 'error')
        }
    }

    const refreshData = async () => {
        try {
            const [statsRes, schoolsRes, feedbackRes] = await Promise.all([
                superAdminAPI.getStats(),
                superAdminAPI.getSchools(),
                superAdminAPI.getFeedback()
            ])
            setStats(statsRes.data)
            setSchools(schoolsRes.data)
            setFeedback(feedbackRes.data)
        } catch (error) {
            console.error('Error refreshing data:', error)
        }
    }

    const handleResolveFeedback = async (id: number) => {
        try {
            await superAdminAPI.resolveFeedback(id)
            toast('Đã xử lý phản hồi', 'success')
            const res = await superAdminAPI.getFeedback()
            setFeedback(res.data)
            const statsRes = await superAdminAPI.getStats()
            setStats(statsRes.data)
        } catch (error) {
            toast('Lỗi khi xử lý phản hồi', 'error')
        }
    }

    const handleAnalyzeFeedback = async () => {
        setAnalyzing(true)
        setAiAnalysis(null)
        setShowAnalysisModal(true)
        try {
            const res = await superAdminAPI.getFeedbackAnalysis()
            setAiAnalysis(res.data.analysis)
        } catch (error: any) {
            toast('Lỗi khi phân tích phản hồi bằng AI', 'error')
            setShowAnalysisModal(false)
        } finally {
            setAnalyzing(false)
        }
    }

    const handleLogout = () => {
        setConfirmModal({
            isOpen: true,
            type: 'logout',
            title: 'Xác nhận đăng xuất',
            message: 'Bạn có chắc chắn muốn rời khỏi hệ thống quản trị không?',
            confirmText: 'ĐĂNG XUẤT',
            variant: 'danger',
            onConfirm: () => {
                sessionStorage.clear()
                router.push('/login/admin')
            }
        })
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-30">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <Shield className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight leading-none">SUPER</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Management</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === 'overview' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" /> Tổng quan
                    </button>
                    <button
                        onClick={() => setActiveTab('schools')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === 'schools' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <Building2 className="w-5 h-5" /> Quản lý trường học
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${activeTab === 'feedback' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <div className="relative">
                            <MessageSquare className="w-5 h-5" />
                            {stats?.pending_feedback > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />}
                        </div>
                        Phản hồi hệ thống
                    </button>
                </nav>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <span className="font-black">SA</span>
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm truncate">{user?.full_name || 'Super Admin'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">System Owner</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all font-bold group"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-10">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">
                            {activeTab === 'overview' ? 'Dashboard Tổng Quan' : activeTab === 'schools' ? 'Danh Sách Trường' : 'Hộp Thư Phản Hồi'}
                        </h2>
                        <p className="text-slate-500 font-medium">Xin chào, hệ thống hiện có <span className="text-indigo-600 font-bold">{stats?.total_schools} trường học</span> đang hoạt động.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Server Status</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-sm font-black text-emerald-600 uppercase tracking-tighter">Connected</span>
                            </div>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-10"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { title: 'Tên trường', value: stats?.total_schools, icon: School, color: 'blue', label: 'Cơ sở giáo dục' },
                                    { title: 'Tổng người dùng', value: stats?.total_users, icon: Users, color: 'indigo', label: 'Tài khoản hoạt động' },
                                    { title: 'Tổng học sinh', value: stats?.total_students, icon: TrendingUp, color: 'emerald', label: 'Học viên chính thức' },
                                    { title: 'Chờ phản hồi', value: stats?.pending_feedback, icon: MessageSquare, color: 'rose', label: 'Cần giải quyết' }
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                        <div className={`absolute -right-4 -top-4 w-32 h-32 bg-${item.color}-500/5 rounded-full blur-3xl group-hover:bg-${item.color}-500/10 transition-colors`} />
                                        <div className={`w-14 h-14 bg-${item.color}-50 dark:bg-${item.color}-500/10 rounded-2xl flex items-center justify-center text-${item.color}-600 dark:text-${item.color}-400 mb-6`}>
                                            <item.icon className="w-7 h-7" />
                                        </div>
                                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">{item.title}</p>
                                        <h3 className="text-4xl font-black mb-2">{item.value || 0}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-2xl font-black tracking-tight">Trường mới gia nhập</h3>
                                        <button onClick={() => setActiveTab('schools')} className="text-indigo-600 font-bold hover:underline flex items-center gap-1">Xem tất cả <ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="space-y-4">
                                        {schools.slice(0, 5).map(school => (
                                            <div key={school.id} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-sm">
                                                        <Building2 className="w-7 h-7 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-lg leading-none mb-2">{school.name}</p>
                                                        <p className="text-sm text-slate-500 font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {school.province}, {school.district}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-indigo-600">{school.user_count}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Thành viên</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden flex flex-col">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                                    <div className="relative z-10">
                                        <Settings className="w-12 h-12 mb-8 opacity-50" />
                                        <h3 className="text-3xl font-black mb-4">Hệ thống Multi-School</h3>
                                        <p className="text-indigo-100 font-medium leading-relaxed mb-10">Bạn đang quản trị hệ thống tập trung. Mọi thay đổi sẽ ảnh hưởng đến khả năng truy cập của các trường trực thuộc.</p>
                                        <button
                                            onClick={() => setShowSchoolModal(true)}
                                            className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 group mb-3"
                                        >
                                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Thêm trường mới
                                        </button>
                                        <button
                                            onClick={handleCleanupSchools}
                                            className="w-full bg-rose-500/20 text-rose-100 py-4 rounded-2xl font-black border border-rose-500/30 hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:shake transition-transform" /> Dọn dẹp hệ thống
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'schools' && (
                        <motion.div
                            key="schools"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <div className="flex bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 gap-8 items-center">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm trường học..."
                                        className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-lg"
                                    />
                                </div>
                                <button
                                    onClick={() => setShowSchoolModal(true)}
                                    className="px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <Plus className="w-6 h-6" /> Thêm trường
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {schools.map(school => (
                                    <div key={school.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 hover:shadow-2xl transition-all group overflow-hidden relative">
                                        <div className="flex justify-between items-start mb-10 relative z-10">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                                                <Building2 className="w-8 h-8 text-indigo-500" />
                                            </div>
                                            <span className="px-5 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">{school.levels || 'K-12'}</span>
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="text-2xl font-black mb-2 leading-tight">{school.name}</h4>
                                            <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5 mb-8">
                                                <MapPin className="w-4 h-4" /> {school.address || `${school.province || ''}, ${school.district || ''}`}
                                            </p>

                                            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Mã trường</p>
                                                    <p className="font-black text-indigo-900 dark:text-indigo-400">#SCH-{school.id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Thành viên</p>
                                                    <p className="font-black text-slate-900 dark:text-slate-100">{school.user_count}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-6">
                                                <button
                                                    onClick={() => { setSelectedSchool(school); setShowAdminModal(true); }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                                                >
                                                    <UserPlus className="w-4 h-4" /> Cấp Admin
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSchool(school.id)}
                                                    className="w-12 flex items-center justify-center py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl font-bold hover:bg-rose-100 transition-all"
                                                    title="Xóa trường học"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'feedback' && (
                        <motion.div
                            key="feedback"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                                <div>
                                    <h3 className="text-xl font-black mb-1">Quản Lý Phản Hồi</h3>
                                    <p className="text-sm text-slate-500 font-medium">Lắng nghe và cải thiện hệ thống dựa trên ý kiến người dùng.</p>
                                </div>
                                <button
                                    onClick={handleAnalyzeFeedback}
                                    disabled={feedback.length === 0}
                                    className="px-6 py-3.5 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    Phân tích AI
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-10 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b-2 border-slate-50 dark:border-slate-800">
                                                <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Người gửi</th>
                                                <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trường học</th>
                                                <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Chủ đề</th>
                                                <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nội dung</th>
                                                <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Trạng thái</th>
                                                <th className="text-right py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {feedback.map(item => (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-8 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                                {item.full_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm">{item.full_name}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase font-black">{item.role}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-8 px-4">
                                                        <span className="font-bold text-sm text-slate-600 dark:text-slate-300">{item.school_name}</span>
                                                    </td>
                                                    <td className="py-8 px-4">
                                                        <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200">{item.subject}</span>
                                                    </td>
                                                    <td className="py-8 px-4">
                                                        <p className="text-sm text-slate-500 max-w-sm line-clamp-2 leading-relaxed">{item.message}</p>
                                                    </td>
                                                    <td className="py-8 px-4 text-center">
                                                        {item.status === 'pending' ? (
                                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                                <AlertCircle className="w-3 h-3" /> Chờ xử lý
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3" /> Đã xong
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-8 px-4 text-right">
                                                        {item.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleResolveFeedback(item.id)}
                                                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                                                            >
                                                                Giải quyết
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {feedback.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-20 text-center text-slate-400 font-bold italic">Chưa có phản hồi nào từ người dùng.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Create School Modal */}
            {showSchoolModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
                    >
                        <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-indigo-600 text-white">
                            <div>
                                <h3 className="text-3xl font-black mb-1">Thêm Trường Học</h3>
                                <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs">Mở rộng mạng lưới giáo dục</p>
                            </div>
                            <button onClick={() => setShowSchoolModal(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group">
                                <Plus className="w-8 h-8 rotate-45 group-hover:rotate-[135deg] transition-transform" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSchool} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Tên trường học</label>
                                    <input
                                        type="text"
                                        required
                                        value={schoolFormData.name}
                                        onChange={e => setSchoolFormData({ ...schoolFormData, name: e.target.value })}
                                        placeholder="VD: Trường THCS & THPT Lê Quý Đôn"
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 border border-slate-100 dark:border-slate-700 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Cấp bậc</label>
                                    <select
                                        value={schoolFormData.levels}
                                        onChange={e => setSchoolFormData({ ...schoolFormData, levels: e.target.value })}
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 transition-all font-bold"
                                    >
                                        <option value="thcs">THCS</option>
                                        <option value="thpt">THPT</option>
                                        <option value="thcs,thpt">Liên cấp THCS, THPT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Tỉnh/Thành</label>
                                    <input
                                        type="text"
                                        value={schoolFormData.province}
                                        onChange={e => setSchoolFormData({ ...schoolFormData, province: e.target.value })}
                                        placeholder="VD: Hà Nội"
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Quận/Huyện</label>
                                    <input
                                        type="text"
                                        value={schoolFormData.district}
                                        onChange={e => setSchoolFormData({ ...schoolFormData, district: e.target.value })}
                                        placeholder="VD: Cầu Giấy"
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-2">Địa chỉ chi tiết</label>
                                    <input
                                        type="text"
                                        value={schoolFormData.address}
                                        onChange={e => setSchoolFormData({ ...schoolFormData, address: e.target.value })}
                                        placeholder="Số nhà, tên đường..."
                                        className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl outline-none border border-slate-100 dark:border-slate-700 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowSchoolModal(false)}
                                    className="flex-1 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-3xl font-black transition-all hover:bg-slate-200"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    Xác nhận thêm trường <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Create Admin Modal */}
            {showAdminModal && selectedSchool && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
                    >
                        <div className="p-8 bg-indigo-600 text-white">
                            <h3 className="text-2xl font-black">Cấp Quyền Admin</h3>
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">Trường: {selectedSchool.name}</p>
                        </div>

                        <form onSubmit={handleCreateAdmin} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    required
                                    value={adminFormData.username}
                                    onChange={e => setAdminFormData({ ...adminFormData, username: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    value={adminFormData.password}
                                    onChange={e => setAdminFormData({ ...adminFormData, password: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Họ và tên</label>
                                <input
                                    type="text"
                                    required
                                    value={adminFormData.full_name}
                                    onChange={e => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAdminModal(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                >
                                    Tạo tài khoản
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText="HỦY BỎ"
                icon={confirmModal.type === 'logout' ? LogOut : Trash2}
                variant={confirmModal.variant}
            />

            {/* AI Analysis Modal */}
            {showAnalysisModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 max-h-[80vh] flex flex-col"
                    >
                        <div className="p-8 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black mb-1">Phân Tích Phản Hồi AI</h3>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Tổng hợp xu hướng 30 ngày qua</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAnalysisModal(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            {analyzing ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="font-black text-slate-500 animate-pulse uppercase tracking-widest text-sm">Đang phân tích dữ liệu...</p>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 whitespace-pre-wrap font-medium leading-relaxed">
                                        {aiAnalysis}
                                    </div>
                                </div>
                            )}
                        </div>
                        {!analyzing && (
                            <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <button
                                    onClick={() => setShowAnalysisModal(false)}
                                    className="w-full py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
                                >
                                    ĐÓNG CỬA SỔ
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    )
}

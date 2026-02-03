'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User,
    Camera,
    Save,
    ArrowLeft,
    School,
    Calendar,
    BookOpen,
    Mail,
    CheckCircle2,
    AlertCircle,
    Award,
    Briefcase,
    GraduationCap,
    Clock,
    Shield,
    Sparkles,
    Book,
    Target
} from 'lucide-react'
import { userAPI, API_URL } from '@/lib/api'
import api from '@/lib/api'
import { Bell, MapPin, School as SchoolIcon, GraduationCap as Cap, UserCircle, Map as MapIcon, Globe } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import LoadingSpinner from '@/components/LoadingSpinner'
import { provinces, districtsByProvince, wardsByDistrict, schoolsByProvince, getGenericSchools } from '@/lib/locationData'

export default function ProfilePage() {
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [badges, setBadges] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'info' | 'achievements'>('info')


    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        grade_level: '',
        school: '',
        birth_date: '',
        specialty: '',
        qualification: '',
        receive_notifications: 1,
        gender: '',
        place_of_birth: '',
        province: '',
        district: '',
        ward: '',
        school_level: '',
        class_name: ''
    })

    useEffect(() => {
        const token = sessionStorage.getItem('token')
        if (!token) {
            router.push('/login/student')
            return
        }

        userAPI.getProfile()
            .then((response) => {
                const u = response.data
                setUser(u)
                setFormData({
                    full_name: u.full_name || '',
                    email: u.email || '',
                    grade_level: u.grade_level || '',
                    school: u.school || '',
                    birth_date: u.birth_date || '',
                    specialty: u.specialty || '',
                    qualification: u.qualification || '',
                    receive_notifications: u.receive_notifications !== undefined ? u.receive_notifications : 1,
                    gender: u.gender || '',
                    place_of_birth: u.place_of_birth || '',
                    province: u.province || '',
                    district: u.district || '',
                    ward: u.ward || '',
                    school_level: u.school_level || '',
                    class_name: u.class_name || ''
                })

            })
            .catch((err) => {
                console.error('Error fetching profile:', err)
                const userStr = sessionStorage.getItem('user')
                if (userStr) {
                    const parsed = JSON.parse(userStr)
                    router.push(parsed.role === 'admin' || parsed.role === 'teacher' ? '/admin/dashboard' : '/dashboard')
                } else {
                    router.push('/')
                }
            })
            .finally(() => setLoading(false))

        // Fetch user badges
        api.get('/user/badges')
            .then(res => setBadges(res.data))
            .catch(err => console.error('Error fetching badges:', err))
    }, [router])


    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            await userAPI.updateProfile(formData)
            setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' })
            const updatedUser = { ...user, ...formData }
            setUser(updatedUser)
            sessionStorage.setItem('user', JSON.stringify(updatedUser))

            // Update specific notification setting if changed
            if (formData.receive_notifications !== user.receive_notifications) {
                await api.post('/user/settings/notifications', { receive_notifications: formData.receive_notifications })
            }

            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Không thể cập nhật thông tin' })
        } finally {
            setSaving(false)
        }
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const uploadData = new FormData()
        uploadData.append('avatar', file)

        try {
            setSaving(true)
            const response = await userAPI.uploadAvatar(uploadData)
            const newAvatarUrl = response.data.avatar_url
            setUser({ ...user, avatar_url: newAvatarUrl })

            const userStr = sessionStorage.getItem('user')
            const localUser = JSON.parse(userStr || '{}')
            localUser.avatar_url = newAvatarUrl
            sessionStorage.setItem('user', JSON.stringify(localUser))

            setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Không thể tải ảnh lên' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner size="lg" text="Đang tải hồ sơ..." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 transition-colors duration-300">
            {/* Header / Top Nav */}
            <div className="bg-card border-b border-border sticky top-0 z-20">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <button
                        onClick={() => {
                            const userStr = sessionStorage.getItem('user')
                            const role = user?.role || (userStr ? JSON.parse(userStr).role : null)
                            if (role === 'admin' || role === 'teacher') {
                                router.push('/admin/dashboard')
                            } else {
                                router.push('/dashboard')
                            }
                        }}
                        className="flex items-center gap-2 text-muted-foreground font-bold hover:text-blue-600 transition-colors group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        Quay lại
                    </button>

                    <div className="flex items-center gap-6">
                        <ThemeToggle />
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <span className="font-black text-foreground uppercase tracking-widest text-xs">Cài đặt tài khoản</span>
                        </div>
                    </div>

                    <div className="w-[100px] h-10 hidden md:block"></div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column: Avatar & Quick Info */}
                    <div className="space-y-6">
                        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-8 text-center relative overflow-hidden group transition-colors">
                            {/* Decorative background */}
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-tr from-blue-600 to-indigo-700"></div>

                            <div className="relative z-10">
                                <div className="relative inline-block mt-4">
                                    <div className="w-32 h-32 rounded-3xl bg-card p-1 shadow-2xl overflow-hidden mb-6 mx-auto">
                                        <div className="w-full h-full rounded-2xl bg-muted overflow-hidden relative">
                                            <img
                                                src={user?.avatar_url ? `${API_URL}${user.avatar_url}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAvatarClick}
                                        className="absolute bottom-4 right-[-8px] w-10 h-10 bg-card rounded-xl shadow-xl border border-border flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                </div>

                                <h1 className="text-2xl font-black text-foreground tracking-tight">{user?.full_name || user?.username}</h1>
                                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">@{user?.username}</p>

                                <div className="mt-8 flex items-center justify-center gap-2">
                                    <div className="px-4 py-2 bg-muted rounded-2xl border border-border flex items-center gap-2">
                                        <Award className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-black text-foreground">{user?.points || 0} XP</span>
                                    </div>
                                    <div className="px-4 py-2 bg-muted rounded-2xl border border-border flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-black text-foreground">{user?.study_streak || 0} Ngày</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-[2.5rem] p-8 text-white">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-400" />
                                Thông tin hệ thống
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                                    <span className="text-slate-400">Loại tài khoản</span>
                                    <span className="font-bold uppercase tracking-widest text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md">{user?.role}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                                    <span className="text-slate-400">Ngày tham gia</span>
                                    <span className="font-bold">{new Date(user?.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm py-2">
                                    <span className="text-slate-400">Trạng thái</span>
                                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                        Đang hoạt động
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-8">
                            <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Quyền riêng tư
                            </h3>
                            <div className="flex items-center justify-between p-4 bg-muted rounded-2xl border border-border">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Nhận thông báo</p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Cập nhật nội dung mới</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, receive_notifications: formData.receive_notifications === 1 ? 0 : 1 })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${formData.receive_notifications === 1 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.receive_notifications === 1 ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-card rounded-[2.5rem] border border-border shadow-sm p-10">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight">Cài đặt tài khoản</h2>
                                    <p className="text-muted-foreground font-medium">Quản lý thông tin và thành tựu của bạn</p>
                                </div>
                                <div className="flex gap-2 bg-muted p-1 rounded-2xl border border-border">
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'info' ? 'bg-card text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        THÔNG TIN
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('achievements')}
                                        className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'achievements' ? 'bg-card text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        THÀNH TỰU ({badges.length})
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence mode="wait">
                                {activeTab === 'info' ? (
                                    <motion.div
                                        key="info"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {message && (
                                            <div className={`mb-8 p-5 rounded-3xl flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                                <p className="font-black text-sm">{message.text}</p>
                                            </div>
                                        )}
                                        <form onSubmit={handleUpdateProfile} className="space-y-8">
                                            {/* ... rest of the form ... */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Họ và tên đầy đủ</label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="text"
                                                            value={formData.full_name}
                                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                            className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Địa chỉ Email</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 ml-1">Tên trường học (VD: Trường THPT Chu Văn An)</label>
                                                    <div className="relative">
                                                        <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                                        <input
                                                            type="text"
                                                            value={formData.school}
                                                            onChange={(e) => setFormData({ ...formData, school: e.target.value.toUpperCase() })}
                                                            className="w-full pl-12 pr-5 py-4 bg-muted border-2 border-blue-100 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black outline-none text-foreground placeholder:text-muted-foreground"
                                                            placeholder="NHẬP TÊN TRƯỜNG..."
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {user?.role !== 'admin' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Ngày sinh nhật</label>
                                                            <div className="relative">
                                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <input
                                                                    type="date"
                                                                    value={formData.birth_date ? formData.birth_date.split('T')[0] : ''}
                                                                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground color-scheme-dark"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Giới tính</label>
                                                            <div className="relative">
                                                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <select
                                                                    value={formData.gender}
                                                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none appearance-none text-foreground"
                                                                >
                                                                    <option value="" className="bg-card">Chọn giới tính</option>
                                                                    <option value="Nam">Nam</option>
                                                                    <option value="Nữ">Nữ</option>
                                                                    <option value="Khác">Khác</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Nơi sinh (Tỉnh/TP)</label>
                                                            <div className="relative">
                                                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <input
                                                                    type="text"
                                                                    value={formData.place_of_birth}
                                                                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                                    placeholder="Nhập tỉnh/thành..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Tỉnh / Thành phố</label>
                                                        <div className="relative">
                                                            <MapIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                value={formData.province}
                                                                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                                                className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                                placeholder="Nhập tỉnh/thành..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Huyện / Quận</label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                value={formData.district}
                                                                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                                                className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                                placeholder="Nhập huyện/quận..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Xã / Phường</label>
                                                        <div className="relative">
                                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                            <input
                                                                type="text"
                                                                value={formData.ward}
                                                                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                                                                className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none text-foreground placeholder:text-muted-foreground"
                                                                placeholder="Nhập xã/phường..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {user?.role !== 'admin' && (
                                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Cấp bậc học</label>
                                                            <div className="relative">
                                                                <Cap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <select
                                                                    value={formData.school_level}
                                                                    onChange={(e) => {
                                                                        const newLevel = e.target.value;
                                                                        setFormData({
                                                                            ...formData,
                                                                            school_level: newLevel,
                                                                            grade_level: '' // Reset grade when level changes
                                                                        });
                                                                    }}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none appearance-none text-foreground"
                                                                >
                                                                    <option value="" className="bg-card">Chọn cấp bậc</option>
                                                                    <option value="tiểu học">Tiểu học</option>
                                                                    <option value="trung học cơ sở">Trung học cơ sở</option>
                                                                    <option value="trung học phổ thông">Trung học phổ thông</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 ml-1">Khối lớp</label>
                                                            <div className="relative">
                                                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                                <select
                                                                    value={formData.grade_level}
                                                                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border border-border rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold outline-none appearance-none text-foreground"
                                                                    required={user?.role !== 'admin'}
                                                                >
                                                                    <option value="" className="bg-card">Chọn khối</option>
                                                                    {formData.school_level === 'tiểu học' && (
                                                                        <>
                                                                            <option value="tieu_hoc_1">Khối 1</option>
                                                                            <option value="tieu_hoc_2">Khối 2</option>
                                                                            <option value="tieu_hoc_3">Khối 3</option>
                                                                            <option value="tieu_hoc_4">Khối 4</option>
                                                                            <option value="tieu_hoc_5">Khối 5</option>
                                                                        </>
                                                                    )}
                                                                    {formData.school_level === 'trung học cơ sở' && (
                                                                        <>
                                                                            <option value="thcs_6">Khối 6</option>
                                                                            <option value="thcs_7">Khối 7</option>
                                                                            <option value="thcs_8">Khối 8</option>
                                                                            <option value="thcs_9">Khối 9</option>
                                                                        </>
                                                                    )}
                                                                    {formData.school_level === 'trung học phổ thông' && (
                                                                        <>
                                                                            <option value="thpt_10">Khối 10</option>
                                                                            <option value="thpt_11">Khối 11</option>
                                                                            <option value="thpt_12">Khối 12</option>
                                                                        </>
                                                                    )}
                                                                    {!formData.school_level && (
                                                                        <option value="" disabled>Vui lòng chọn cấp bậc trước</option>
                                                                    )}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 ml-1">Lớp học (Ví dụ: 6A1)</label>
                                                            <div className="relative">
                                                                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                                                <input
                                                                    type="text"
                                                                    value={formData.class_name}
                                                                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value.toUpperCase() })}
                                                                    className="w-full pl-12 pr-5 py-4 bg-muted border-2 border-blue-100 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black outline-none text-foreground placeholder:text-muted-foreground"
                                                                    placeholder="VD: 6A1..."
                                                                    required={user?.role !== 'admin'}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Professional Info (Teachers Only) - Hidden for admins as requested */}
                                                {user?.role === 'teacher' && (
                                                    <>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Chuyên môn</label>
                                                            <div className="relative group">
                                                                <Book className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                                <input
                                                                    type="text"
                                                                    value={formData.specialty}
                                                                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-slate-700"
                                                                    placeholder="Toán học, Công nghệ thông tin..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">Trình độ đào tạo</label>
                                                            <div className="relative group">
                                                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                                                <input
                                                                    type="text"
                                                                    value={formData.qualification}
                                                                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-slate-700"
                                                                    placeholder="Cử nhân, Thạc sĩ, Tiến sĩ..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="pt-6">
                                                <motion.button
                                                    whileHover={{ scale: 1.01, y: -2 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="submit"
                                                    disabled={saving}
                                                    className="w-full bg-blue-600 text-white py-5 rounded-[1.25rem] font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                                >
                                                    <Save className="w-6 h-6" />
                                                    {saving ? 'ĐANG LƯU HỒ SƠ...' : 'LƯU THAY ĐỔI'}
                                                </motion.button>
                                            </div>
                                        </form>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="achievements"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-6"
                                    >
                                        {badges.length === 0 ? (
                                            <div className="text-center py-20 bg-muted rounded-[2.5rem] border border-dashed border-border">
                                                <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                                    <Award className="w-10 h-10 text-muted-foreground" />
                                                </div>
                                                <h3 className="text-xl font-black text-foreground">Chưa có huy hiệu nào</h3>
                                                <p className="text-muted-foreground font-medium mt-2 max-w-xs mx-auto">
                                                    Hãy hoàn thành các bài thi và bài tập để nhận được những huy hiệu đầu tiên!
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {badges.map((badge, idx) => (
                                                    <motion.div
                                                        key={badge.id}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="bg-muted p-6 rounded-[2rem] border border-border flex items-center gap-5 group hover:bg-card transition-all cursor-default"
                                                    >
                                                        <div className="w-16 h-16 bg-card rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                                                            {badge.icon}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-black text-foreground">{badge.name}</h4>
                                                            <p className="text-xs text-muted-foreground font-medium mt-1">{badge.description}</p>
                                                            <div className="mt-2 flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase">Đã nhận: {new Date(badge.awarded_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import api, { API_URL } from '@/lib/api'
import { io, Socket } from 'socket.io-client'
import { ShieldAlert, X, Globe } from 'lucide-react'
import { useMonitoring } from '@/context/MonitoringContext'
import { useToast } from '@/context/ToastContext'
import html2canvas from 'html2canvas'

// --- DICTIONARY FOR MONITORING ---
const VIOLATION_DICT = {
    AI: ['chatgpt', 'openai', 'gemini', 'claude', 'bard', 'poe.com', 'blackbox', 'copilot', 'lms', 'loigiaihay', 'vietjack', 'hoc24', 'hoidap247', 'olm.vn', 'shub', 'vuihoc', 'hocmai', 'tuyensinh247'],
    SOCIAL: ['facebook', 'messenger', 'zalo', 'tiktok', 'instagram', 'twitter', 'x.com', 'youtube', 'discord', 'telegram', 'spotify', 'netflix', 'vimeo', 'twitch'],
    DEV_TOOLS: ['inspect element', 'developer tools', 'view-source:']
}

export default function GlobalMonitor() {
    const pathname = usePathname()
    const { toast } = useToast()
    const {
        isProctoringEnabled, setIsProctoringEnabled,
        setIsConnected, setTriggerAutoSubmit,
        violationOverlay, setViolationOverlay,
        setIsSharingActive
    } = useMonitoring() as any

    // --- STATE ---
    const [user, setUser] = useState<any>(null)
    const [isMonitored, setIsMonitored] = useState(false)
    const [clientIp, setClientIp] = useState('')
    const [classStatus, setClassStatus] = useState<any>(null)
    const [globalProctoring, setGlobalProctoring] = useState(false)
    const [globalSocialMonitoring, setGlobalSocialMonitoring] = useState(false)
    const [globalTestMonitoring, setGlobalTestMonitoring] = useState(false)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [socketConnected, setSocketConnected] = useState(false)
    const [activeFilters, setActiveFilters] = useState({ ai: false, social: false })
    const [isProxyRunning, setIsProxyRunning] = useState(false)
    const [countdown, setCountdown] = useState<number | null>(null)

    // Trạng thái giám sát hiện tại: 'none' | 'strict' (thi) | 'monitoring' (AI/Social)
    const [monitoringMode, setMonitoringMode] = useState<'none' | 'strict' | 'monitoring'>('none')

    // --- REFS ---
    const socketRef = useRef<Socket | null>(null)
    const isSessionActiveRef = useRef(false)
    const pathnameRef = useRef(pathname)
    const monitoringModeRef = useRef(monitoringMode)

    useEffect(() => { pathnameRef.current = pathname }, [pathname])
    useEffect(() => { monitoringModeRef.current = monitoringMode }, [monitoringMode])

    const getSystemTime = () => new Date()

    const captureViolationScreenshot = async () => {
        return new Promise<string>(async (resolve) => {
            const timeout = setTimeout(() => {
                console.warn("Screenshot capture timed out, returning empty.")
                resolve("")
            }, 3000)

            try {
                const canvas = await html2canvas(document.body, {
                    logging: false,
                    useCORS: true,
                    scale: 0.4
                })
                clearTimeout(timeout)
                resolve(canvas.toDataURL('image/jpeg', 0.5))
            } catch (err) {
                console.error('Lỗi khi chụp ảnh màn hình:', err)
                clearTimeout(timeout)
                resolve("")
            }
        })
    }

    const handleViolation = async (reason: string) => {
        if (!isProctoringEnabled || !isSessionActiveRef.current) return

        try {
            console.log(`🛡️ Monitoring Violation: ${reason}`)
            let screenshot = ""
            try {
                screenshot = await captureViolationScreenshot()
            } catch (e) {
                console.error("Critical error during screenshot:", e)
            }

            const classId = classStatus?.id || 0
            let currentUserId = user?.id

            if (!currentUserId) {
                try {
                    const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}')
                    currentUserId = storedUser.id
                } catch (e) { }
            }

            if (!currentUserId) {
                console.error("❌ Cannot report violation: No User ID found")
                return
            }

            await api.post('/admin/violations/report', {
                user_id: currentUserId,
                violation_type: reason,
                evidence_image: screenshot,
                class_id: classId
            })

            if (monitoringModeRef.current === 'strict') {
                setViolationOverlay({
                    visible: true,
                    reason: reason,
                    timestamp: new Date().toISOString()
                })
                toast(`VI PHẠM QUY CHẾ: ${reason}. Hành vi đã được ghi lại bằng chứng!`, 'error')
            } else {
                toast(`CẢNH BÁO: Hệ thống phát hiện ${reason}. Hành vi đã được ghi lại!`, 'warning')
            }
        } catch (err) {
            console.error('Lỗi khi gửi báo cáo vi phạm:', err)
        }
    }

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (monitoringModeRef.current !== 'strict') return
            if (document.hidden) {
                handleViolation("Rời khỏi trang thi (Chuyển Tab)")
            }
        }

        const handleBlur = () => {
            if (monitoringModeRef.current === 'strict' && document.activeElement?.tagName !== 'IFRAME') {
                handleViolation("Rời khỏi cửa sổ trình duyệt (Rời trang thi)")
            }
        }

        const handleFullscreenChange = () => {
            const isNowFull = !!document.fullscreenElement
            setIsFullScreen(isNowFull)
            if (monitoringModeRef.current === 'strict' && !isNowFull) {
                handleViolation("Thoát chế độ Toàn màn hình trong lúc thi")
            }
        }

        const blockActions = (e: any) => {
            if (monitoringModeRef.current !== 'strict') return
            if (e.type === 'contextmenu') e.preventDefault()
            if (e.type === 'keydown') {
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                    (e.ctrlKey && e.key === 'U')) {
                    e.preventDefault()
                    handleViolation("Cố gắng mở DevTools bằng phím tắt")
                }
            }
        }

        if (isMonitored) {
            document.addEventListener('visibilitychange', handleVisibilityChange)
            window.addEventListener('blur', handleBlur)
            document.addEventListener('fullscreenchange', handleFullscreenChange)
            document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.addEventListener('mozfullscreenchange', handleFullscreenChange)
            document.addEventListener('MSFullscreenChange', handleFullscreenChange)
            document.addEventListener('contextmenu', blockActions)
            document.addEventListener('keydown', blockActions)
            setIsFullScreen(!!document.fullscreenElement)
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('blur', handleBlur)
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
            document.removeEventListener('contextmenu', blockActions)
            document.removeEventListener('keydown', blockActions)
        }
    }, [isMonitored])

    useEffect(() => {
        const scanInterval = setInterval(() => {
            if (!isSessionActiveRef.current) return
            const title = document.title.toLowerCase()
            const url = window.location.href.toLowerCase()
            let foundReason = ""

            if (activeFilters.ai && VIOLATION_DICT.AI.some(k => title.includes(k) || url.includes(k))) {
                foundReason = `Sử dụng công cụ AI: ${VIOLATION_DICT.AI.find(k => title.includes(k) || url.includes(k))}`
            }
            else if (activeFilters.social && VIOLATION_DICT.SOCIAL.some(k => title.includes(k) || url.includes(k))) {
                foundReason = `Sử dụng Mạng xã hội: ${VIOLATION_DICT.SOCIAL.find(k => title.includes(k) || url.includes(k))}`
            }
            else if (monitoringModeRef.current === 'strict' && VIOLATION_DICT.DEV_TOOLS.some(k => title.includes(k) || url.includes(k))) {
                foundReason = `Truy cập công cụ lập trình (DevTools)`
            }

            if (foundReason) {
                handleViolation(foundReason)
            }
        }, 2000)

        const titleNode = document.querySelector('title')
        const observer = new MutationObserver(() => {
            if (!isSessionActiveRef.current) return
            const title = document.title.toLowerCase()
            if (activeFilters.ai && VIOLATION_DICT.AI.some(k => title.includes(k))) {
                handleViolation(`[Instant] Công cụ AI: ${VIOLATION_DICT.AI.find(k => title.includes(k))}`)
            } else if (activeFilters.social && VIOLATION_DICT.SOCIAL.some(k => title.includes(k))) {
                handleViolation(`[Instant] Mạng xã hội: ${VIOLATION_DICT.SOCIAL.find(k => title.includes(k))}`)
            }
        })
        if (titleNode) observer.observe(titleNode, { childList: true })

        return () => {
            clearInterval(scanInterval)
            observer.disconnect()
        }
    }, [activeFilters])

    useEffect(() => {
        let timer: NodeJS.Timeout
        const isTestPage = pathname?.includes('/tests/') && !pathname?.includes('/result')
        if (monitoringMode === 'strict' && !isFullScreen && isSessionActiveRef.current && isTestPage) {
            if (countdown === null) {
                setCountdown(3)
            } else if (countdown > 0) {
                timer = setTimeout(() => {
                    setCountdown(prev => (prev !== null ? prev - 1 : null))
                }, 1000)
            } else {
                setTriggerAutoSubmit("Tự động nộp bài do thoát Toàn màn hình quá 3 giây")
                setCountdown(null)
            }
        } else {
            setCountdown(null)
        }
        return () => clearTimeout(timer)
    }, [monitoringMode, isFullScreen, countdown, pathname])

    const refreshData = async () => {
        try {
            // Fetch fresh user data to avoid closure bug
            const userData = JSON.parse(sessionStorage.getItem('user') || '{}')
            const token = sessionStorage.getItem('token')
            const currentPath = pathnameRef.current || ''
            let contextStatus = 'Đang hoạt động'
            if (currentPath.includes('/tests/')) contextStatus = 'Đang làm bài kiểm tra'
            else if (currentPath.includes('/practice/')) contextStatus = 'Đang luyện tập'
            else if (currentPath.includes('/lessons/')) contextStatus = 'Đang học bài giảng'

            const [ipRes, statusRes, settingsRes] = await Promise.all([
                fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => ({ ip: 'N/A' })),
                api.get('/user/class-status').catch(() => ({ data: null })),
                api.get(`/settings/proctoring?school_id=${userData?.school_id || ''}`).catch(() => ({ data: { proctoring_enabled: false, social_monitoring_enabled: false, test_monitoring_enabled: false } })),
                token ? api.post('/user/heartbeat', {
                    participation_status: contextStatus,
                    os_info: navigator.platform,
                    browser_info: navigator.userAgent.split(' ').slice(-1)[0],
                    client_time: new Date().toISOString()
                }).catch(() => null) : Promise.resolve(null)
            ])

            if (ipRes.ip) setClientIp(ipRes.ip)
            if (statusRes.data) setClassStatus(statusRes.data)
            setGlobalProctoring(settingsRes.data?.proctoring_enabled === true || settingsRes.data?.proctoring_enabled === '1' || settingsRes.data?.proctoring_enabled === 1)
            setGlobalSocialMonitoring(settingsRes.data?.social_monitoring_enabled === true || settingsRes.data?.social_monitoring_enabled === '1' || settingsRes.data?.social_monitoring_enabled === 1)
            setGlobalTestMonitoring(settingsRes.data?.test_monitoring_enabled === true || settingsRes.data?.test_monitoring_enabled === '1' || settingsRes.data?.test_monitoring_enabled === 1)

            // Nếu là giáo viên và không có lớp, đổi tên hiển thị
            if (userData?.role === 'teacher' && !statusRes.data?.id) {
                setClassStatus({ ...statusRes.data, class_name: 'Giáo viên Tự do' });
            } else if (statusRes.data) {
                setClassStatus(statusRes.data);
            }

            const isTestPage = window.location.pathname.includes('/tests/') && !window.location.pathname.includes('/result')
            if (isTestPage && settingsRes.data?.proctoring_enabled === true) {
                monitoringModeRef.current = 'strict'
            }
        } catch (e) {
            console.error("Data refresh failed:", e)
        }
    }

    useEffect(() => {
        let userData: any = {}
        try {
            userData = JSON.parse(sessionStorage.getItem('user') || '{}')
        } catch (e) { }

        if (userData?.role === 'student' || userData?.role === 'teacher') {
            setIsMonitored(true)
            setUser(userData)
        }

        const socket = io(API_URL)
        socketRef.current = socket
        socket.on('connect', () => { setIsConnected(true); setSocketConnected(true) })
        socket.on('disconnect', () => { setIsConnected(false); setSocketConnected(false) })

        const handleSync = ({ type, enabled, mode }: { type: string, enabled: any, mode?: any }) => {
            console.log('Received monitoring-sync:', { type, enabled, mode })
            const isEnabled = enabled === true || enabled === '1' || enabled === 1
            const lowerType = type.toLowerCase()

            if (lowerType === 'ai' || lowerType === 'study') {
                setGlobalProctoring(isEnabled);
                setClassStatus((prev: any) => prev ? { ...prev, study_monitoring: isEnabled } : prev);
                setActiveFilters(prev => ({ ...prev, ai: isEnabled }))
                toast(`Hệ thống: Giám sát AI đã ${isEnabled ? 'BẬT' : 'TẮT'}`, isEnabled ? 'info' : 'warning');
            }
            else if (lowerType === 'social') {
                setGlobalSocialMonitoring(isEnabled);
                setClassStatus((prev: any) => prev ? { ...prev, social_monitoring: isEnabled } : prev);
                setActiveFilters(prev => ({ ...prev, social: isEnabled }))
                toast(`Hệ thống: Giám sát Mạng xã hội đã ${isEnabled ? 'BẬT' : 'TẮT'}`, isEnabled ? 'info' : 'warning');
            }
            else if (lowerType === 'test') {
                setGlobalTestMonitoring(isEnabled)
                setClassStatus((prev: any) => prev ? { ...prev, test_monitoring: isEnabled } : prev);
                toast(`Hệ thống: Chế độ thi cử đã ${isEnabled ? 'BẬT' : 'TẮT'}`, isEnabled ? 'info' : 'warning');
                if (isEnabled && mode === 'strict') {
                    setMonitoringMode('strict')
                    setIsProctoringEnabled(true)
                }
            }
            // NO setTimeout(refreshData) here - it causes flickering if DB hasn't updated yet
        }

        socket.on('monitoring-sync', handleSync)
        refreshData()
        const interval = setInterval(refreshData, 30000)
        return () => {
            clearInterval(interval)
            socket.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!isMonitored) {
            setIsProxyRunning(true);
            isSessionActiveRef.current = false;
            return;
        }

        const checkProxyStatus = async () => {
            // Nếu không ở chế độ strict, ta vẫn cố gắng gửi heartbeat tới app nhưng không coi lỗi là "ngừng chạy" làm treo máy
            try {
                if (user?.id) {
                    const userName = encodeURIComponent(user.full_name || user.username || 'N/A');
                    const userLevel = encodeURIComponent(user.level || (user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'));
                    const className = encodeURIComponent(classStatus?.class_name || 'Tự do');
                    const rawAvatar = user.avatar_url;
                    const fullAvatar = rawAvatar
                        ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_URL}${rawAvatar}`)
                        : `https://api.dicebear.com/7.x/avataaars/png?seed=${user.username}`;
                    const avatarUrl = encodeURIComponent(fullAvatar);
                    const isNone = monitoringMode === 'none';
                    const aiMon = isNone ? 0 : (activeFilters.ai ? 1 : 0);
                    const socMon = isNone ? 0 : (activeFilters.social ? 1 : 0);
                    const testMon = isNone ? 0 : (monitoringMode === 'strict' ? 1 : 0);

                    const regUrl = `http://127.0.0.1:1111/register?userId=${user.id}&userName=${userName}&userLevel=${userLevel}&className=${className}&classId=${classStatus?.id || 0}&mode=${monitoringMode}&aiMonitor=${aiMon}&socialMonitor=${socMon}&testMonitor=${testMon}&apiUrl=${encodeURIComponent(API_URL)}&avatarUrl=${avatarUrl}`;

                    console.log('🔗 [GlobalMonitor] Sending registration to app:', {
                        userId: user.id,
                        userName: user.full_name || user.username,
                        mode: monitoringMode,
                        aiMon, socMon, testMon,
                        url: regUrl
                    });

                    await fetch(regUrl, { mode: 'no-cors' });
                    console.log('✅ [GlobalMonitor] Registration request sent successfully');
                }

                const isMonitoringActive = monitoringMode !== 'none';
                setIsProxyRunning(true);
                setIsSharingActive(isMonitoringActive);
                isSessionActiveRef.current = isMonitoringActive;

                console.log('📊 [GlobalMonitor] Status updated:', {
                    isProxyRunning: true,
                    isSharingActive: isMonitoringActive,
                    monitoringMode
                });
            } catch (e) {
                console.error('❌ [GlobalMonitor] Connection error:', e);
                // Nếu đang bật bất kỳ chế độ giám sát nào mà lỗi kết nối tới app local thì báo ngừng chạy
                if (monitoringMode !== 'none') {
                    setIsProxyRunning(false);
                    setIsSharingActive(false);
                    isSessionActiveRef.current = false;
                    console.warn('⚠️ [GlobalMonitor] Proxy marked as NOT running (monitoring active but connection failed)');
                } else {
                    // Nếu không giám sát, coi như bình thường
                    setIsProxyRunning(true);
                    setIsSharingActive(false);
                    isSessionActiveRef.current = false;
                    console.log('ℹ️ [GlobalMonitor] Proxy marked as running (no monitoring needed)');
                }
            }
        };

        // Nếu ở chế độ strict thì check nhanh hơn (3s), bình thường check chậm (10s)
        const checkInterval = monitoringMode === 'strict' ? 3000 : 10000;
        const timer = setInterval(checkProxyStatus, checkInterval);

        // Gửi request ngay lập tức khi user thay đổi (để app cập nhật ngay)
        checkProxyStatus();

        return () => clearInterval(timer);
    }, [isMonitored, monitoringMode, user, classStatus, activeFilters]);

    // Trigger immediate app update when user.id changes (account switch)
    useEffect(() => {
        if (user?.id && isMonitored) {
            console.log('👤 [GlobalMonitor] User changed, sending immediate update to app:', user.id);
            // Force immediate registration to update app with new user info
            const sendImmediateUpdate = async () => {
                try {
                    const userName = encodeURIComponent(user.full_name || user.username || 'N/A');
                    const userLevel = encodeURIComponent(user.level || (user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'));
                    const className = encodeURIComponent(classStatus?.class_name || 'Tự do');
                    const rawAvatar = user.avatar_url;
                    const fullAvatar = rawAvatar
                        ? (rawAvatar.startsWith('http') ? rawAvatar : `${API_URL}${rawAvatar}`)
                        : `https://api.dicebear.com/7.x/avataaars/png?seed=${user.username}`;
                    const avatarUrl = encodeURIComponent(fullAvatar);
                    const isNone = monitoringMode === 'none';
                    const aiMon = isNone ? 0 : (activeFilters.ai ? 1 : 0);
                    const socMon = isNone ? 0 : (activeFilters.social ? 1 : 0);
                    const testMon = isNone ? 0 : (monitoringMode === 'strict' ? 1 : 0);

                    const regUrl = `http://127.0.0.1:1111/register?userId=${user.id}&userName=${userName}&userLevel=${userLevel}&className=${className}&classId=${classStatus?.id || 0}&mode=${monitoringMode}&aiMonitor=${aiMon}&socialMonitor=${socMon}&testMonitor=${testMon}&apiUrl=${encodeURIComponent(API_URL)}&avatarUrl=${avatarUrl}`;

                    console.log('🔄 [GlobalMonitor] Immediate update sent to app');
                    await fetch(regUrl, { mode: 'no-cors' });
                } catch (e) {
                    console.error('❌ [GlobalMonitor] Immediate update failed:', e);
                }
            };
            sendImmediateUpdate();
        }
    }, [user?.id]); // Only trigger when user.id changes


    useEffect(() => {
        if (socketConnected && isMonitored) {
            socketRef.current?.emit('join-room', 'global_proctoring')
            socketRef.current?.emit('join-room', 'monitoring_global')
            if (classStatus?.id && user?.school_id) {
                // Join school-specific class room for proper isolation
                const roomId = `school_${user.school_id}_class_${classStatus.id}`;
                console.log(`📍 [GlobalMonitor] Joining room: ${roomId}`);
                socketRef.current?.emit('join-room', roomId)
            }
            if (user?.school_id) {
                socketRef.current?.emit('join-room', `school_${user.school_id}`)
            }
        }
    }, [socketConnected, classStatus, isMonitored, user?.school_id])

    useEffect(() => {
        if (!isMonitored) return
        const currentPath = pathname || ''
        const isAdminPath = currentPath.startsWith('/admin')

        if (isAdminPath) {
            setMonitoringMode('none')
            setIsProctoringEnabled(false)
            return
        }

        const isTestPage = currentPath.includes('/tests/') && !currentPath.includes('/result')

        // --- XÁC ĐỊNH CHẾ ĐỘ GIÁM SÁT ---
        let mode: 'none' | 'strict' | 'monitoring' = 'none'
        const isInClassRoom = !!classStatus?.in_class

        // Kiểm tra lịch học (nếu có)
        let isScheduled = false
        if (classStatus?.schedule_start && classStatus?.schedule_end) {
            const now = getSystemTime()
            const [startH, startM] = classStatus.schedule_start.split(':').map(Number)
            const [endH, endM] = classStatus.schedule_end.split(':').map(Number)
            const startTime = new Date(now).setHours(startH, startM, 0, 0)
            const endTime = new Date(now).setHours(endH, endM, 0, 0)
            isScheduled = now.getTime() >= startTime && now.getTime() <= endTime
        }
        const isActiveTime = !classStatus?.schedule_start || isScheduled

        // 1. Chế độ THI (Strict): Bật nếu đang ở trang thi VÀ (Global Test Mon hoặc Class Test Mon)
        const isTestMonActive = globalTestMonitoring || (isInClassRoom && isActiveTime && classStatus.test_monitoring)

        // 2. Chế độ GIÁM SÁT (AI/Social): Bật ở MỌI trang nếu (Global AI/Social hoặc Class AI/Social)
        const isAiMonActive = globalProctoring || (isInClassRoom && isActiveTime && classStatus.study_monitoring)
        const isSocialMonActive = globalSocialMonitoring || (isInClassRoom && isActiveTime && classStatus.social_monitoring)

        if (isTestPage && isTestMonActive) {
            mode = 'strict'
        } else if (isAiMonActive || isSocialMonActive) {
            mode = 'monitoring'
        }

        setMonitoringMode(mode)
        setIsProctoringEnabled(mode !== 'none')
        setActiveFilters({
            ai: mode === 'strict' || isAiMonActive,
            social: mode === 'strict' || isSocialMonActive
        })
    }, [pathname, classStatus, globalProctoring, globalSocialMonitoring, globalTestMonitoring, isMonitored])

    if (!isMonitored || !isProctoringEnabled) return null

    const isTestPage = pathname?.includes('/tests/') && !pathname?.includes('/result')

    return (
        <AnimatePresence>
            {monitoringMode !== 'none' && (
                <motion.div
                    key="status-overlay"
                    initial={{ y: -50 }}
                    animate={{ y: 0 }}
                    exit={{ y: -50 }}
                    className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none"
                >
                    <div className={`px-4 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-2 backdrop-blur shadow-xl ${monitoringMode === 'strict' ? 'bg-red-900/90 text-red-100 border-red-500/30' : 'bg-blue-900/90 text-blue-100 border-blue-500/30'}`}>
                        <span className="relative flex h-2.5 w-2.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${monitoringMode === 'strict' ? 'bg-red-400' : 'bg-blue-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${monitoringMode === 'strict' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                        </span>
                        {monitoringMode === 'strict' ? 'CHẾ ĐỘ THI: GIÁM SÁT PROXY' : 'GIÁM SÁT MẠNG ĐANG BẬT'}
                    </div>
                </motion.div>
            )}

            {/* Màn hình chặn bắt buộc (Must Enable App & Fullscreen Overlay) */}
            {monitoringMode !== 'none' && (!isProxyRunning || (monitoringMode === 'strict' && !isFullScreen && isSessionActiveRef.current && isTestPage)) && (
                <div key="mandatory-overlay" className="fixed inset-0 z-[60000] bg-gradient-to-br from-red-950 via-red-900 to-red-950 flex items-center justify-center p-8">
                    <div className="relative max-w-lg w-full bg-gradient-to-br from-red-800/90 to-red-900/90 backdrop-blur-xl rounded-[3rem] p-12 shadow-2xl border border-red-700/50">
                        {/* Icon Shield */}
                        <div className="flex justify-center mb-8">
                            <div className="relative">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.3, 0.5, 0.3]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -inset-4 bg-red-500/30 rounded-full blur-2xl"
                                />
                                <div className="relative w-24 h-24 bg-red-700/50 rounded-3xl flex items-center justify-center border-2 border-red-600/50">
                                    <ShieldAlert className="w-12 h-12 text-red-200" strokeWidth={2.5} />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-black text-white text-center mb-6 uppercase tracking-tight leading-tight">
                            YÊU CẦU GIÁM SÁT
                        </h2>

                        {/* Content */}
                        <div className="space-y-4 mb-8">
                            {!isProxyRunning && (
                                <p className="text-white/90 text-center font-medium leading-relaxed">
                                    • Hệ thống yêu cầu chạy ứng dụng <span className="font-bold text-white">Edusmart.rar</span> để giám sát.
                                </p>
                            )}
                            {monitoringMode === 'strict' && !isFullScreen && (
                                <>
                                    <p className="text-white/90 text-center font-medium leading-relaxed">
                                        • Chế độ thi yêu cầu trình duyệt phải ở trạng thái <span className="font-bold text-white">Toàn màn hình</span>.
                                    </p>
                                    <div className="mt-6 bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-2xl text-center shadow-lg animate-pulse">
                                        TỰ ĐỘNG NỘP BÀI SAU: {countdown}S
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Button */}
                        <div className="space-y-3">
                            {!isFullScreen && monitoringMode === 'strict' && (
                                <button
                                    onClick={() => {
                                        document.documentElement.requestFullscreen().catch(() => {
                                            toast('Lỗi: Hãy nhấn F11 để vào Toàn màn hình!', 'error')
                                        })
                                    }}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-500 transition-all active:scale-95 uppercase text-sm"
                                >
                                    BẬT TOÀN MÀN HÌNH
                                </button>
                            )}
                            {!isProxyRunning && (
                                <button
                                    onClick={() => {
                                        window.open(`${API_URL}/downloads/Edusmart.rar`, '_blank')
                                    }}
                                    className="w-full py-4 bg-white text-red-900 rounded-2xl font-black shadow-xl hover:bg-red-50 transition-all active:scale-95 uppercase text-sm"
                                >
                                    TẢI/MỞ APP GIÁM SÁT
                                </button>
                            )}
                        </div>

                        {/* Footer */}
                        <p className="mt-8 text-xs text-red-200/60 text-center font-medium uppercase tracking-wider leading-relaxed">
                            Trạng thái: Hệ thống giám sát Edusmart hỗ trợ bảo đảng tính<br />chính trực trong thi cử.
                        </p>
                    </div>
                </div>
            )}

            {monitoringMode === 'strict' && violationOverlay?.visible && (
                <div key="violation-overlay" className="fixed inset-0 z-[70000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-red-500/10 p-12 rounded-[50px] border-2 border-red-500/50 backdrop-blur-2xl shadow-[0_0_100px_rgba(239,68,68,0.2)] flex flex-col items-center max-w-2xl">
                        <div className="relative mb-8">
                            <ShieldAlert className="w-32 h-32 text-red-500 animate-pulse" />
                            <div className="absolute -inset-4 bg-red-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
                        </div>
                        <h2 className="text-5xl font-black text-white mb-6 uppercase italic tracking-tighter leading-none">
                            CẢNH BÁO VI PHẠM!
                        </h2>
                        <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl mb-8 w-full">
                            <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-2">Lý do ghi nhận:</p>
                            <p className="text-white text-xl font-medium italic">"{violationOverlay.reason}"</p>
                        </div>
                        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                            Hệ thống đã tự động chụp ảnh màn hình và gửi báo cáo về cho Hội đồng thi.
                            Vui lòng nhấn nút bên dưới để quay lại làm bài và không tiếp tục vi phạm.
                        </p>
                        <button
                            onClick={async () => {
                                try {
                                    if (document.documentElement.requestFullscreen) {
                                        await document.documentElement.requestFullscreen()
                                    }
                                    setViolationOverlay({ visible: false, reason: '', timestamp: '' })
                                } catch (e) {
                                    toast('Vui lòng bật lại Toàn màn hình!', 'error')
                                }
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white px-12 py-5 rounded-2xl font-black shadow-[0_10px_40px_rgba(220,38,38,0.4)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-lg"
                        >
                            Tôi đã hiểu & Quay lại làm bài
                        </button>
                    </div>
                </div>
            )}
        </AnimatePresence>
    )
}

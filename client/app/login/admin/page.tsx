'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, User, ArrowRight, GraduationCap, Mail, Book, Calendar, Phone } from 'lucide-react'
import { authAPI } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

export default function AdminLogin() {
  const router = useRouter()
  const { toast } = useToast()
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [otpStep, setOtpStep] = useState(1) // 1: request, 2: verify
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(formData.username, formData.password, 'admin')
      const { token, user } = response.data
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))
      if (user.is_super_admin === 1) {
        router.push('/super-admin/dashboard')
      } else {
        router.push('/admin/dashboard')
      }
    } catch (err: any) {
      try {
        const response = await authAPI.login(formData.username, formData.password, 'teacher')
        const { token, user } = response.data
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(user))
        if (user.is_super_admin === 1) {
          router.push('/super-admin/dashboard')
        } else {
          router.push('/admin/dashboard')
        }
      } catch (teacherErr: any) {
        setError(err.response?.data?.error || 'Đăng nhập thất bại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const [resetUsername, setResetUsername] = useState('')

  const handleRequestOTP = async () => {
    setError('')
    setLoading(true)
    try {
      const response = await authAPI.requestOTP({
        identifier,
        purpose: 'reset_password',
        username: resetUsername
      })
      setOtpStep(2)
      toast('Mã OTP đã được gửi!', 'success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể gửi mã xác thực')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setError('')
    setLoading(true)
    try {
      await authAPI.verifyOTP({
        identifier,
        otp,
        purpose: 'reset_password',
        new_password: newPassword
      })
      toast('Mật khẩu đã được thay đổi thành công!', 'success')
      setShowForgotPassword(false)
      setOtpStep(1)
      setOtp('')
      setNewPassword('')
      setIdentifier('')
      setResetUsername('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Mã xác thực không chính xác')
    } finally {
      setLoading(false)
    }
  }

  // Registration removed as per request

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-md w-full relative z-10 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-10">
            <motion.div
              layoutId="logo"
              className="w-20 h-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 group"
            >
              <Shield className="w-10 h-10 text-white transition-transform group-hover:scale-110" />
            </motion.div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {showForgotPassword ? 'Khôi Phục' : 'Hệ Thống'}
            </h1>
            <p className="text-purple-200 font-medium opacity-80 uppercase tracking-widest text-[10px]">
              {showForgotPassword ? 'Đặt lại mật khẩu bảo mật' : 'Hệ thống quản trị giáo dục'}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/20 border border-rose-500/50 text-rose-100 px-4 py-3 rounded-2xl mb-6 backdrop-blur-sm text-xs font-bold flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 px-4 py-3 rounded-2xl mb-6 backdrop-blur-sm text-xs font-bold flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {success}
            </motion.div>
          )}


          {showForgotPassword ? (
            <div className="space-y-6">
              {otpStep === 1 ? (
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                    <input
                      type="text"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-bold"
                      placeholder="Tên đăng nhập"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium"
                      placeholder="Email / SĐT đã đăng ký"
                    />
                  </div>
                  <button
                    onClick={handleRequestOTP}
                    disabled={loading || !identifier || !resetUsername}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl hover:from-purple-700 font-black shadow-xl disabled:opacity-50 active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                    {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-3xl tracking-[0.5em] font-black focus:ring-4 focus:ring-purple-500/20 outline-none"
                    maxLength={6}
                    placeholder="000000"
                  />
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/20 outline-none font-medium"
                      placeholder="Mật khẩu mới"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6 || !newPassword}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 shadow-xl disabled:opacity-50 active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                    {loading ? 'Đang thực hiện...' : 'Xác thực & Cập nhật'}
                  </button>
                </div>
              )}
              <button onClick={() => { setShowForgotPassword(false); setOtpStep(1); setError(''); }} className="w-full text-purple-200 text-sm font-bold hover:text-white transition-colors">
                Quay lại đăng nhập
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium"
                    placeholder="Tên đăng nhập"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-purple-300 focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium"
                    placeholder="Mật khẩu"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => { setShowForgotPassword(true); setError(''); }} className="text-xs text-purple-200 font-bold hover:text-white transition-colors">Quên mật khẩu?</button>
              </div>

              <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5 rounded-2xl hover:from-purple-700 transition-all font-black shadow-xl shadow-purple-900/40 uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </motion.button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center space-y-4">
            <Link href="/" className="text-purple-300/40 hover:text-white text-[10px] flex items-center justify-center gap-1 font-black uppercase tracking-widest mt-4">
              <GraduationCap className="w-3 h-3" /> Về trang chủ
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

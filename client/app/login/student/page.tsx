'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI } from '@/lib/api'
import { motion } from 'framer-motion'
import { GraduationCap } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { auth as firebaseAuth } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  getIdToken
} from 'firebase/auth'

export default function StudentLogin() {
  const router = useRouter()
  const { toast } = useToast()
  const [isRegister, setIsRegister] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpStep, setOtpStep] = useState(1) // 1: request, 2: verify
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })

  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    email: '',
    grade_level: 'thcs_6',
    gender: '',
    birth_date: '',
    place_of_birth: '',
    province: '',
    district: '',
    ward: '',
    school: '',
    class_name: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Try Standard Backend Login first (Username/Password)
      try {
        const response = await authAPI.login(formData.username, formData.password, 'student')
        const { token, user } = response.data
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(user))

        // Redirect to school-specific page if school info exists
        router.push('/dashboard')
        return // Success!
      } catch (stdErr: any) {
        console.log('Standard login failed, trying Firebase...', stdErr.response?.data?.error || stdErr.message)
        // If it's a 401/404, we proceed to try Firebase
      }

      // 2. Try Firebase Sign In (Assuming username field might contain email)
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, formData.username, formData.password)

      // 2.1. Check Email Verification
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user)
        setError('Email chưa được xác thực. Chúng tôi đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư và xác thực trước khi đăng nhập.')
        setLoading(false)
        return
      }

      const idToken = await getIdToken(userCredential.user)

      // 3. Project Backend Sign In (Sync with SQLite)
      const response = await authAPI.loginFirebase(idToken)
      const { token, user } = response.data

      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))

      // Redirect to school-specific page if school info exists
      router.push('/dashboard')
    } catch (err: any) {
      console.error('All login methods failed:', err);
      let errorMessage = 'Đăng nhập thất bại.'
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const [resetUsername, setResetUsername] = useState('')

  const handleRequestOTP = async (purpose: 'register' | 'reset_password') => {
    setError('')
    setLoading(true)
    try {
      if (purpose === 'reset_password') {
        await sendPasswordResetEmail(firebaseAuth, identifier)
        toast('Link đặt lại mật khẩu đã được gửi vào email của bạn!', 'success')
        setShowForgotPassword(false)
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi gửi yêu cầu.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (purpose: 'register' | 'reset_password') => {
    setError('')
    setLoading(true)
    try {
      const response = await authAPI.verifyOTP({
        identifier: identifier || registerData.email,
        otp,
        purpose,
        new_password: newPassword
      })
      if (purpose === 'reset_password') {
        toast('Mật khẩu đã được thay đổi thành công!', 'success')
        setShowForgotPassword(false)
        setOtpStep(1)
        setIdentifier('')
        setResetUsername('')
        setOtp('')
        setNewPassword('')
      } else {
        const { token, user } = response.data
        sessionStorage.setItem('token', token)
        sessionStorage.setItem('user', JSON.stringify(user))

        // Redirect to school-specific page if school info exists
        if (user.school_id || user.school_name) {
          const schoolPath = user.school_name ? user.school_name.toLowerCase().replace(/\s+/g, '-') : `school-${user.school_id}`
          router.push(`/schools/${schoolPath}`)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Mã OTP không chính xác hoặc đã hết hạn')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerData.password !== registerData.confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.')
      return
    }

    setError('')
    setLoading(true)

    try {
      // 1. Firebase Create User
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        registerData.email,
        registerData.password
      )

      // 2. Send Email Verification
      await sendEmailVerification(userCredential.user)

      const idToken = await getIdToken(userCredential.user)

      // 3. Project Backend Register (Sync with SQLite)
      const response = await authAPI.registerFirebase(idToken, registerData)
      const { token, user } = response.data

      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))
      toast('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', 'success')

      // Redirect to school-specific page if school info exists
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Registration error:', err);
      let errorMessage = 'Đăng ký thất bại.'
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được sử dụng.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu.'
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-r from-indigo-500/20 to-pink-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-md w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 relative z-10 border border-gray-200">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <GraduationCap className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {showForgotPassword ? 'Quên Mật Khẩu' : isRegister ? 'Đăng Ký Học Sinh' : 'Đăng Nhập Học Sinh'}
          </h1>
          <p className="text-gray-600">
            {showForgotPassword ? 'Khôi phục mật khẩu của bạn' : isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập vào tài khoản của bạn'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl mb-4 text-sm font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            {error}
          </div>
        )}


        {showForgotPassword ? (
          <div className="space-y-6">
            {otpStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold"
                    placeholder="Nhập username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email / SĐT đã đăng ký</label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder="Nhập email hoặc số điện thoại"
                  />
                </div>
                <button
                  onClick={() => handleRequestOTP('reset_password')}
                  disabled={loading || !identifier || !resetUsername}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
                >
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi mã xác thực (OTP)'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center uppercase tracking-widest font-black opacity-50">Nhập mã OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center text-3xl tracking-[0.8em] font-black focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    maxLength={6}
                    placeholder="000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  onClick={() => handleVerifyOTP('reset_password')}
                  disabled={loading || otp.length < 6 || !newPassword}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  {loading ? 'Đang lưu mật khẩu...' : 'Xác thực & Thay đổi'}
                </button>
              </div>
            )}
            <button
              onClick={() => { setShowForgotPassword(false); setOtpStep(1); setIdentifier(''); setOtp(''); setNewPassword(''); setError(''); }}
              className="w-full text-blue-600 text-sm font-bold hover:underline"
            >
              Quay lại đăng nhập
            </button>
          </div>
        ) : !isRegister ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email hoặc Tên đăng nhập</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Nhập email hoặc username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setError(''); }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-all font-black shadow-lg shadow-blue-200 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {otpStep === 1 ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    value={registerData.username}
                    onChange={(e) => {
                      setRegisterData({ ...registerData, username: e.target.value })
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email / SĐT (Xác thực)</label>
                  <input
                    type="text"
                    value={registerData.email}
                    onChange={(e) => {
                      setRegisterData({ ...registerData, email: e.target.value })
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="example@gmail.com"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                    <input
                      type="text"
                      value={registerData.full_name}
                      onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                    <select
                      value={registerData.gender}
                      onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      required
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      value={registerData.birth_date}
                      onChange={(e) => setRegisterData({ ...registerData, birth_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
                    <select
                      value={registerData.grade_level}
                      onChange={(e) => setRegisterData({ ...registerData, grade_level: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nơi sinh</label>
                    <input
                      type="text"
                      value={registerData.place_of_birth}
                      onChange={(e) => setRegisterData({ ...registerData, place_of_birth: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="VD: Hà Nội"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
                    <input
                      type="text"
                      value={registerData.province}
                      onChange={(e) => setRegisterData({ ...registerData, province: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Tỉnh/Thành"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
                    <input
                      type="text"
                      value={registerData.district}
                      onChange={(e) => setRegisterData({ ...registerData, district: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Quận/Huyện"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
                    <input
                      type="text"
                      value={registerData.ward}
                      onChange={(e) => setRegisterData({ ...registerData, ward: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Phường/Xã"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trường học</label>
                  <input
                    type="text"
                    value={registerData.school}
                    onChange={(e) => setRegisterData({ ...registerData, school: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                    placeholder="Tên trường học"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-blue-600 font-bold">Tên lớp học (Bắt buộc - Ví dụ: 6A1)</label>
                  <input
                    type="text"
                    value={registerData.class_name}
                    onChange={(e) => setRegisterData({ ...registerData, class_name: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold placeholder:font-normal"
                    placeholder="VD: 6A1, 9/2, 12A..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
                  <input
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  {loading ? 'Đang kiểm tra...' : 'Tiếp tục & Nhận OTP'}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">Mã xác thực đã được gửi tới</p>
                  <p className="font-bold text-gray-900 bg-gray-50 py-1 rounded-full px-4 inline-block">{registerData.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center uppercase tracking-widest font-black opacity-50">Nhập mã OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl text-center text-3xl tracking-[0.5em] font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    maxLength={6}
                    placeholder="000000"
                  />
                </div>
                <button
                  onClick={() => handleVerifyOTP('register')}
                  disabled={loading || otp.length < 6}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
                >
                  {loading ? 'Đang hoàn tất đăng ký...' : 'Xác nhận & Tạo tài khoản'}
                </button>
                <button
                  onClick={() => { setOtpStep(1); setOtp(''); }}
                  className="w-full text-xs text-gray-400 font-bold hover:underline"
                >
                  Thay đổi thông tin đăng ký
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setShowForgotPassword(false)
              setOtpStep(1)
              setError('')
              setOtp('')
              setIdentifier('')
            }}
            className="text-gray-500 hover:text-blue-600 text-sm font-bold transition-colors"
          >
            {isRegister ? (
              <>Đã có tài khoản? <span className="text-blue-600 underline">Đăng nhập ngay</span></>
            ) : (
              <>Chưa có tài khoản? <span className="text-blue-600 underline">Đăng ký tham gia</span></>
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1">
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
            Về trang chủ
            <span className="w-1 h-1 bg-gray-300 rounded-full" />
          </Link>
        </div>
      </div>
    </div>
  )
}

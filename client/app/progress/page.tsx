'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, CheckCircle, Award, BookOpen, Target } from 'lucide-react'
import { userAPI } from '@/lib/api'
import ChatbotWidget from '@/components/ChatbotWidget'

export default function Progress() {
  const router = useRouter()
  const [progress, setProgress] = useState<any[]>([])
  const [testResults, setTestResults] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('lessons') // 'lessons', 'tests'

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    if (!token) {
      router.push('/login/student')
      return
    }

    const userData = sessionStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    loadProgress()
  }, [router])

  const loadProgress = async () => {
    try {
      const [profileResponse, progressResponse, testResponse] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getProgress(),
        userAPI.getTestResults()
      ])
      setUser(profileResponse.data)
      setProgress(progressResponse.data)
      setTestResults(testResponse.data)
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalLessons = progress.length
  const completedLessons = progress.filter(p => p.completed).length
  const totalScore = progress.reduce((sum, p) => sum + (p.score || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Về Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tiến Trình Học Tập</h1>
          <div></div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg"
          >
            <BookOpen className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{completedLessons}/{totalLessons}</div>
            <div className="text-blue-100">Bài học đã hoàn thành</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg"
          >
            <CheckCircle className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{totalScore}</div>
            <div className="text-green-100">Tổng điểm</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg"
          >
            <Award className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold">{user?.points || 0}</div>
            <div className="text-purple-100">Điểm hiện tại</div>
          </motion.div>
        </div>

        {loading ? (
          <div className="text-center py-12">Đang tải...</div>
        ) : progress.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Chưa có tiến trình học tập nào.</p>
            <Link href="/lessons" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              Bắt đầu học ngay →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden">
            <div className="flex border-b mb-6">
              <button
                onClick={() => setActiveTab('lessons')}
                className={`px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'lessons' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Tiến trình bài học
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'tests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Bảng điểm kiểm tra 📝
              </button>
            </div>

            {activeTab === 'lessons' ? (
              <div className="space-y-4">
                {progress.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 font-medium">Bạn chưa hoàn thành bài học nào.</p>
                ) : (
                  progress.map((item) => (
                    <div key={item.lesson_id} className="border-b pb-4 last:border-0 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800">{item.lesson_title}</h3>
                          <p className="text-sm text-slate-500 font-medium uppercase tracking-tighter">
                            {item.subject === 'anh' ? 'Tiếng Anh' :
                              item.subject === 'toan' ? 'Toán học' :
                                item.subject === 'van' ? 'Ngữ văn' : item.subject}
                            • {item.grade_level}
                          </p>
                        </div>
                        <div className="text-right">
                          {item.completed ? (
                            <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-600 border border-emerald-100">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-black">{item.score} điểm</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-bold uppercase text-[10px]">Chưa xong</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Bài kiểm tra</th>
                      <th className="px-6 py-4">Môn học</th>
                      <th className="px-6 py-4">Kết quả</th>
                      <th className="px-6 py-4">Thời gian</th>
                      <th className="px-6 py-4">Ngày hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {testResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">Bạn chưa thực hiện bài kiểm tra nào.</td>
                      </tr>
                    ) : (
                      testResults.map((result) => (
                        <tr key={result.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-5">
                            <div className="font-bold text-slate-800">{result.test_title}</div>
                            <div className="text-xs text-slate-400 font-medium">{result.grade_level}</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              {result.subject === 'anh' ? 'Tiếng Anh' :
                                result.subject === 'toan' ? 'Toán học' :
                                  result.subject === 'van' ? 'Ngữ văn' : result.subject}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <div className={`text-lg font-black ${result.percentage >= 80 ? 'text-emerald-600' : result.percentage >= 50 ? 'text-blue-600' : 'text-rose-600'}`}>
                                {result.score}/{result.total_score}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400">{result.percentage}%</div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-slate-600 font-medium">
                            {Math.floor(result.time_taken / 60)}p {result.time_taken % 60}s
                          </td>
                          <td className="px-6 py-5 text-slate-500 text-sm">
                            {new Date(result.completed_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatbotWidget />
    </div>
  )
}


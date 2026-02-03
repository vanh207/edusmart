'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  BookOpen,
  Target,
  Mic,
  Book,
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Moon,
  Sun
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export default function Home() {
  const router = useRouter()
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)

  // Transform opacity based on scroll
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])
  const heroY = useTransform(scrollY, [0, 300], [0, 100])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('token')
    const userStr = sessionStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.is_super_admin === 1) {
          router.push('/super-admin/dashboard')
        } else if (user.role === 'admin' || user.role === 'teacher') {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      } catch (e) {
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-card/90 backdrop-blur-md shadow-lg py-4 border-b border-border/50' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              E
            </div>
            <span className={`text-2xl font-bold ${isScrolled ? 'text-foreground' : 'text-gray-900'}`}>
              Edu<span className="text-blue-600">Smart</span> Noitru
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className={`${isScrolled ? 'text-muted-foreground' : 'text-gray-600'} hover:text-blue-600 font-medium transition-colors`}>Tính năng</a>
            <a href="#about" className={`${isScrolled ? 'text-muted-foreground' : 'text-gray-600'} hover:text-blue-600 font-medium transition-colors`}>Về chúng tôi</a>
            <a href="#testimonials" className={`${isScrolled ? 'text-muted-foreground' : 'text-gray-600'} hover:text-blue-600 font-medium transition-colors`}>Đánh giá</a>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login/student"
              className="px-6 py-2.5 rounded-full font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
            >
              Đăng nhập
            </Link>
            <Link
              href="/login/student?mode=register"
              className="px-6 py-2.5 rounded-full font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950"></div>
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-[100px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 text-center lg:text-left"
            >
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm mb-6 border border-blue-200">
                🚀 Nền tảng học tập 4.0 hàng đầu Việt Nam
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-foreground leading-tight mb-6">
                Học Tập <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Thông Minh</span><br />
                Tương Lai <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Rạng Ngời</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Hệ thống tích hợp AI giúp cá nhân hóa lộ trình học tập, luyện phát âm chuẩn xác và theo dõi tiến độ chi tiết. Dành riêng cho học sinh THCS & THPT.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/login/student" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-blue-600/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                  Bắt đầu học ngay <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-card text-foreground border border-border rounded-2xl font-bold text-lg hover:bg-accent hover:-translate-y-1 shadow-sm transition-all flex items-center justify-center gap-2">
                  Tìm hiểu thêm
                </Link>
              </div>

              <div className="mt-12 flex items-center justify-center lg:justify-start gap-8">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`w-12 h-12 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden`}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-full border-4 border-card bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                    +2k
                  </div>
                </div>
                <div>
                  <div className="flex text-yellow-500 mb-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Hơn 2,000 học sinh tin dùng</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              style={{ opacity: heroOpacity, y: heroY }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:w-1/2 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-card">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
                  alt="Students learning"
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-card/90 backdrop-blur-md p-4 rounded-xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Hoàn thành bài học</h3>
                      <p className="text-sm text-muted-foreground">Bạn vừa đạt 100 điểm bài kiểm tra!</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="font-bold text-foreground text-sm">500+ Bài học</span>
              </motion.div>

              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-10 -left-10 bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Mic className="w-6 h-6" />
                </div>
                <span className="font-bold text-foreground text-sm">AI Luyện nói</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-4">Tại sao chọn chúng tôi?</h2>
            <h3 className="text-4xl font-bold text-foreground mb-6">Mọi thứ bạn cần để <span className="text-blue-600">bứt phá</span> điểm số</h3>
            <p className="text-muted-foreground text-lg">Hệ thống bài giảng chất lượng cao kết hợp công nghệ AI tiên tiến giúp việc học trở nên thú vị và hiệu quả hơn bao giờ hết.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Book,
                title: "Kho Tài Liệu Đồ Sộ",
                desc: "Hàng ngàn bài giảng, bài tập bám sát chương trình sách giáo khoa mới nhất.",
                color: "blue"
              },
              {
                icon: Mic,
                title: "Luyện Phát Âm AI",
                desc: "Công nghệ nhận diện giọng nói giúp bạn sửa lỗi phát âm tiếng Anh chính xác từng chi tiết.",
                color: "green"
              },
              {
                icon: Target,
                title: "Lộ Trình Cá Nhân Hóa",
                desc: "Hệ thống tự động đề xuất bài học phù hợp với năng lực và mục tiêu của bạn.",
                color: "purple"
              },
              {
                icon: Trophy,
                title: "Thử Thách & Xếp Hạng",
                desc: "Vừa học vừa chơi với hệ thống điểm thưởng và bảng xếp hạng thi đua.",
                color: "amber"
              },
              {
                icon: Shield,
                title: "Nội Dung Chất Lượng",
                desc: "Được biên soạn bởi đội ngũ giáo viên giàu kinh nghiệm từ các trường điểm.",
                color: "red"
              },
              {
                icon: Zap,
                title: "Hỗ Trợ 24/7",
                desc: "Trợ lý ảo AI sẵn sàng giải đáp thắc mắc của bạn bất cứ lúc nào.",
                color: "indigo"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className="bg-card rounded-2xl p-8 border border-border hover:shadow-xl transition-all group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-100 dark:bg-${feature.color}-900/30 flex items-center justify-center text-${feature.color}-600 dark:text-${feature.color}-400 mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-foreground mb-3 group-hover:text-blue-600 transition-colors">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Sẵn sàng để bứt phá thành tích?</h2>
          <p className="text-blue-100 text-xl max-w-2xl mx-auto mb-12">
            Tham gia cộng đồng học tập thông minh ngay hôm nay và trải nghiệm phương pháp học tập hoàn toàn mới.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/login/student?mode=register"
              className="w-full sm:w-auto px-10 py-5 bg-foreground text-background rounded-full font-bold text-lg hover:bg-foreground/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Đăng Ký Tài Khoản Miễn Phí
            </Link>
            <Link
              href="/login/admin"
              className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white/30 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all"
            >
              Đăng Nhập Quản Trị Viên
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card text-muted-foreground py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
                <span className="text-xl font-bold text-foreground">EduSmart Noitru</span>
              </div>
              <p className="max-w-xs">
                Nền tảng học tập trực tuyến tích hợp trí tuệ nhân tạo, giúp học sinh tiếp cận tri thức mọi lúc mọi nơi.
              </p>
            </div>
            <div>
              <h4 className="text-foreground font-bold mb-4">Liên kết</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Chính sách bảo mật</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Điều khoản sử dụng</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-bold mb-4">Liên hệ</h4>
              <ul className="space-y-2">
                <li>contact@edusmart.vn</li>
                <li>+84 123 456 789</li>
                <li>Hà Nội, Việt Nam</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm">
            © 2024 EduSmart Noitru. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

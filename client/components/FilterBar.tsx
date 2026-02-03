'use client'

import { useState, useEffect } from 'react'
import { Filter, ChevronDown, GraduationCap, BookOpen, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FilterBarProps {
    onFilterChange: (filters: { grade_level: string; subject: string; search: string }) => void
    initialFilters?: { grade_level?: string; subject?: string; search?: string }
}

export default function FilterBar({ onFilterChange, initialFilters }: FilterBarProps) {
    const [level, setLevel] = useState<'thcs' | 'thpt' | ''>(
        initialFilters?.grade_level?.startsWith('thcs') ? 'thcs' :
            initialFilters?.grade_level?.startsWith('thpt') ? 'thpt' : ''
    )
    const [grade, setGrade] = useState(initialFilters?.grade_level || '')
    const [subject, setSubject] = useState(initialFilters?.subject || '')
    const [search, setSearch] = useState(initialFilters?.search || '')
    const [isExpanded, setIsExpanded] = useState(false)

    useEffect(() => {
        onFilterChange({ grade_level: grade, subject, search })
    }, [grade, subject, search])

    const handleLevelChange = (newLevel: 'thcs' | 'thpt' | '') => {
        setLevel(newLevel)
        setGrade('') // Reset grade when level changes
    }

    const subjects = [
        { value: 'toan', label: 'Toán học' },
        { value: 'van', label: 'Ngữ văn' },
        { value: 'anh', label: 'Tiếng Anh' },
        { value: 'vat_ly', label: 'Vật lý' },
        { value: 'hoa_hoc', label: 'Hóa học' },
        { value: 'sinh_hoc', label: 'Sinh học' },
        { value: 'su', label: 'Lịch sử' },
        { value: 'dia', label: 'Địa lý' },
    ]

    const grades = level === 'thcs'
        ? [
            { value: 'thcs_6', label: 'Lớp 6' },
            { value: 'thcs_7', label: 'Lớp 7' },
            { value: 'thcs_8', label: 'Lớp 8' },
            { value: 'thcs_9', label: 'Lớp 9' },
        ]
        : level === 'thpt'
            ? [
                { value: 'thpt_10', label: 'Lớp 10' },
                { value: 'thpt_11', label: 'Lớp 11' },
                { value: 'thpt_12', label: 'Lớp 12' },
            ]
            : []

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8 transition-all hover:shadow-md">
            <div className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nội dung học tập..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-700"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`px-6 py-3 rounded-xl border flex items-center gap-2 font-bold transition-all w-full md:w-auto justify-center ${isExpanded ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Bộ lọc nâng cao
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 mt-6">
                                {/* Level Selection */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <GraduationCap className="w-3 h-3" /> Cấp bậc học vấn
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleLevelChange(level === 'thcs' ? '' : 'thcs')}
                                            className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${level === 'thcs' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            THCS
                                        </button>
                                        <button
                                            onClick={() => handleLevelChange(level === 'thpt' ? '' : 'thpt')}
                                            className={`py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${level === 'thpt' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                                                }`}
                                        >
                                            THPT
                                        </button>
                                    </div>
                                </div>

                                {/* Grade Selection */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" /> Chọn lớp học
                                    </label>
                                    <div className="relative">
                                        <select
                                            disabled={!level}
                                            value={grade}
                                            onChange={(e) => setGrade(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">{level ? 'Tất cả lớp' : 'Vui lòng chọn cấp học trước'}</option>
                                            {grades.map((g) => (
                                                <option key={g.value} value={g.value}>{g.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Subject Selection */}
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-3 h-3" /> Môn học
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                                        >
                                            <option value="">Tất cả môn học</option>
                                            {subjects.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

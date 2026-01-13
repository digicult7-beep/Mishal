import { useState } from 'react'
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Task {
    id: string
    title: string
    description: string
    status_id: string
    priority: 'low' | 'medium' | 'high'
    due_date: string
    department_id: string
    department?: {
        name: string
    }
}

interface TaskStatus {
    id: string
    label: string
    color: string
}

interface CalendarViewProps {
    tasks: Task[]
    statuses: TaskStatus[]
    onTaskClick: (task: Task) => void
}

export default function CalendarView({ tasks, statuses, onTaskClick }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const goToToday = () => setCurrentDate(new Date())

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    })

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const getTasksForDay = (day: Date) => {
        return tasks.filter(task => {
            if (!task.due_date) return false
            return isSameDay(new Date(task.due_date), day)
        })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f9fafb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                            onClick={prevMonth}
                            style={{ padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', color: '#374151' }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={goToToday}
                            style={{ padding: '0.25rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}
                        >
                            Today
                        </button>
                        <button
                            onClick={nextMonth}
                            style={{ padding: '0.25rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', background: 'white', cursor: 'pointer', color: '#374151' }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    {weekDays.map(day => (
                        <div key={day} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', flex: 1, overflowY: 'auto' }}>
                    {calendarDays.map((day, dayIdx) => {
                        const dayTasks = getTasksForDay(day)
                        const isCurrentMonth = isSameMonth(day, monthStart)
                        const isTodayDate = isToday(day)

                        return (
                            <div
                                key={day.toString()}
                                style={{
                                    borderRight: (dayIdx + 1) % 7 === 0 ? 'none' : '1px solid #e5e7eb',
                                    borderBottom: '1px solid #e5e7eb',
                                    background: isCurrentMonth ? 'white' : '#f9fafb',
                                    padding: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    minHeight: '120px'
                                }}
                            >
                                <div style={{
                                    textAlign: 'right',
                                    marginBottom: '0.25rem',
                                    fontSize: '0.875rem',
                                    fontWeight: isTodayDate ? '700' : '400',
                                    color: isTodayDate ? '#4f46e5' : isCurrentMonth ? '#374151' : '#9ca3af'
                                }}>
                                    {isTodayDate ? (
                                        <span style={{ background: '#e0e7ff', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>
                                            {format(day, 'd')}
                                        </span>
                                    ) : (
                                        format(day, 'd')
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                                    {dayTasks.map(task => {
                                        const status = statuses.find(s => s.id === task.status_id)
                                        return (
                                            <div
                                                key={task.id}
                                                onClick={() => onTaskClick(task)}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    background: status?.color || '#f3f4f6',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    borderLeft: `3px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#6366f1'}`,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    color: '#374151'
                                                }}
                                                title={task.title}
                                            >
                                                {task.title}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

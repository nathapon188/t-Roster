import React from 'react';
import { ChevronLeft, ChevronRight, Trash2, Plus } from 'lucide-react';
import { Employee, Shift, ShiftStatus, DbClosedDate, StaffGroup } from '../types';
import { STAFF_GROUP_LABELS } from '../constants';

const GROUPS: StaffGroup[] = ['kitchen', 'floor'];

interface DailyListViewProps {
  shifts: Shift[];
  employees: Employee[];
  currentDate: Date;
  onChangeDate: (delta: number) => void;
  onSetDate: (date: Date) => void;
  onEditShift: (shift: Shift) => void;
  onAddShift: (employeeId: string, date: string, type?: 'MORNING' | 'DINNER' | 'LUNCH') => void;
  onDeleteShift: (shiftId: string) => void;
  showOnlyWorking?: boolean;
  closedDates?: DbClosedDate[];
}

const DailyListView: React.FC<DailyListViewProps> = ({ 
  shifts, 
  employees, 
  currentDate, 
  onChangeDate, 
  onSetDate,
  onEditShift, 
  onAddShift, 
  onDeleteShift, 
  showOnlyWorking,
  closedDates = []
}) => {
  
  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateKey = (date: Date) => toLocalDateString(date);
  const isClosed = closedDates.some(d => d.date === formatDateKey(currentDate));

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'employee') {
        onAddShift(data.id, toLocalDateString(currentDate));
      }
    } catch (err) {}
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Date Navigator */}
      <div className={`px-4 py-3 flex items-center justify-between text-white shadow-md z-10 sticky top-0 transition-colors ${isClosed ? 'bg-red-600' : 'bg-green-600'}`}>
        <button 
          onClick={() => onChangeDate(-1)}
          className={`p-1 rounded-full transition ${isClosed ? 'hover:bg-red-700' : 'hover:bg-green-700'}`}
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-lg">
            {isToday(currentDate) ? "Today" : formatDate(currentDate)}
          </span>
          {isClosed && <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 rounded">Closed / Public Holiday</span>}
        </div>
        <button 
          onClick={() => onChangeDate(1)}
          className={`p-1 rounded-full transition ${isClosed ? 'hover:bg-red-700' : 'hover:bg-green-700'}`}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Horizontal Day Selector (Mobile Daily View) */}
      <div className="bg-white border-b border-gray-200 shrink-0 sm:hidden">
        <div className="px-4 pt-3 pb-1 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {showOnlyWorking ? 'Working Staff Summary' : 'Daily Staff Roster'}
          </h2>
          <button 
            onClick={() => onSetDate(new Date())}
            className="text-[10px] font-black text-green-600 uppercase tracking-widest hover:bg-green-50 px-2 py-0.5 rounded"
          >
            Go to Today
          </button>
        </div>
        <div className="px-2 pb-3 flex justify-between items-center overflow-x-auto scrollbar-hide">
          {weekDays.map((day, idx) => {
            const isSelected = formatDateKey(day) === formatDateKey(currentDate);
            const isDayClosed = closedDates.some(d => d.date === formatDateKey(day));
            const isTodayDay = formatDateKey(day) === toLocalDateString(new Date());
            return (
              <button
                key={idx}
                onClick={() => onSetDate(day)}
                className={`flex flex-col items-center min-w-[44px] py-1 rounded-lg transition-all relative ${
                  isSelected 
                    ? 'bg-green-600 text-white shadow-md scale-105' 
                    : isDayClosed 
                      ? 'text-red-400' 
                      : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-sm font-black">{day.getDate()}</span>
                {isTodayDay && !isSelected && <div className="absolute -top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-white" />}
                {isDayClosed && <div className="w-1 h-1 bg-red-500 rounded-full mt-0.5" />}
              </button>
            );
          })}
          </div>
        </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {GROUPS.map(group => {
          const groupEmployees = employees.filter(e => e.group === group);
          const visible = showOnlyWorking
            ? groupEmployees.filter(e => shifts.some(s => s.employeeId === e.id))
            : groupEmployees;

          if (visible.length === 0) return null;

          return (
            <div key={group} className="space-y-3">
              {/* Kitchen / Floor divider */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
                  {STAFF_GROUP_LABELS[group]}
                </span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {visible.map((employee) => {
          const employeeShifts = shifts.filter(s => s.employeeId === employee.id);

          return (
            <div key={employee.id} className="space-y-2">
              {employeeShifts.length === 0 ? (
                // Empty state for employee (not working)
                <div 
                  className="bg-white/50 rounded-lg border border-dashed border-gray-300 p-4 flex items-center opacity-70 hover:opacity-100 transition"
                  onClick={() => onAddShift(employee.id, toLocalDateString(currentDate))}
                >
                  <div className="mr-4 flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shadow-sm ${employee.color} grayscale opacity-50`}>
                      {employee.initials}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-400 text-lg truncate uppercase">{employee.name}</h3>
                    <p className="text-gray-400 text-[10px] uppercase font-bold">NOT WORKING</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-full text-gray-400">
                    <Plus size={16} />
                  </div>
                </div>
              ) : (
                // Employee with shifts
                employeeShifts.map((shift) => {
                  const isLate = shift.status === ShiftStatus.LATE;
                  return (
                    <div 
                      key={shift.id} 
                      onClick={() => onEditShift(shift)}
                      className={`bg-white rounded-lg shadow-sm border-l-8 p-4 flex items-center hover:shadow-md transition active:scale-[0.99] ${isLate ? 'border-red-500' : 'border-green-600'}`}
                    >
                      {/* Initials Avatar */}
                      <div className="mr-4 flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-black shadow-sm ${employee.color} border border-black/5`}>
                          {employee.initials}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-xl truncate uppercase tracking-tight">{employee.name}</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{employee.defaultRole} • {shift.location}</p>
                      </div>

                      {/* Time & Status */}
                      <div className="text-right flex-shrink-0 ml-2 flex flex-col items-end gap-2">
                        <p className="font-black text-gray-900 text-2xl tabular-nums leading-none">
                          {shift.startTime} - {shift.endTime || 'OPEN'}
                        </p>
                        <div className="flex items-center gap-2">
                          {shift.hasBreak && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">
                              -30m Break
                            </span>
                          )}
                          <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${isLate ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {shift.status}
                          </p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteShift(shift.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors no-export"
                            title="Delete Shift"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyListView;
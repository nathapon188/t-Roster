import React from 'react';
import { Clock, Plus, AlertTriangle, DollarSign } from 'lucide-react';
import { Employee, Shift, Role, ShiftStatus } from '../types';
import { EMPLOYEES } from '../constants';

interface WeeklyTimetableViewProps {
  shifts: Shift[];
  currentDate: Date;
  onAddShift: (employeeId: string, date: string) => void;
}

const WeeklyTimetableView: React.FC<WeeklyTimetableViewProps> = ({ shifts, currentDate, onAddShift }) => {
  
  // Helper to get days of the week starting from current date (or start of week)
  const getWeekDays = (baseDate: Date) => {
    const days = [];
    const startOfWeek = new Date(baseDate);
    // Adjust to Monday
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

  const weekDays = getWeekDays(currentDate);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const getShiftsForCell = (employeeId: string, date: Date) => {
    const dateKey = formatDateKey(date);
    return shifts.filter(s => s.employeeId === employeeId && s.date === dateKey);
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.MANAGER: return 'bg-red-500 text-white';
      case Role.CHEF: return 'bg-orange-500 text-white';
      case Role.WAITER: return 'bg-purple-600 text-white';
      case Role.BARISTA: return 'bg-blue-500 text-white';
      case Role.OPEN: return 'bg-black text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-sm">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 border-b border-gray-200">
        <div className="bg-white border rounded px-3 py-1.5 text-gray-600 flex items-center min-w-[150px]">
           <span className="mr-2">👤</span> Select Staff
        </div>
        <div className="bg-white border rounded px-3 py-1.5 text-gray-600 flex items-center min-w-[150px]">
           <span className="mr-2">📍</span> Bourke St Cafe
        </div>
        <div className="flex-1"></div>
        <div className="bg-white border rounded px-3 py-1.5 text-gray-600 flex items-center">
           <span className="mr-2">✓</span> By Staff
        </div>
        <div className="bg-white border rounded px-3 py-1.5 text-gray-600 flex items-center">
           <span className="mr-2">📅</span> All Shifts
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1000px]">
          {/* Header Row */}
          <div className="grid grid-cols-[250px_repeat(7,1fr)] sticky top-0 z-20 shadow-sm">
            <div className="bg-gray-200 p-3 font-semibold text-gray-600 border-r border-b border-white">
              EMPLOYEE NAME
            </div>
            {weekDays.map((day, idx) => (
              <div key={idx} className="bg-gray-200 p-2 border-r border-b border-white">
                <div className="font-semibold text-gray-600 uppercase text-xs">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })} {day.getDate()}/{day.getMonth() + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {EMPLOYEES.map((employee) => (
            <div key={employee.id} className="grid grid-cols-[250px_repeat(7,1fr)] hover:bg-gray-50">
              {/* Employee Column */}
              <div className="p-3 border-r border-b border-gray-100 flex items-start gap-3 bg-white sticky left-0 z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${employee.color}`}>
                  {employee.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{employee.name}</div>
                  {employee.id === 'open' ? (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock size={12} className="mr-1" />
                      <span>21.00</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-gray-500 mt-1 gap-2">
                       <span className="flex items-center"><Clock size={12} className="mr-1"/> 40.00</span>
                       {employee.hourlyRate && <span className="flex items-center"><DollarSign size={12} className="mr-1"/> {employee.hourlyRate}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Day Columns */}
              {weekDays.map((day, idx) => {
                const cellShifts = getShiftsForCell(employee.id, day);
                const isPast = day < new Date(new Date().setHours(0,0,0,0));

                return (
                  <div key={idx} className={`p-1 border-r border-b border-gray-100 relative group min-h-[100px] flex flex-col gap-1 ${isPast ? 'bg-gray-50/50' : ''}`}>
                    
                    {/* Ghost Add Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                       <button 
                        onClick={() => onAddShift(employee.id, formatDateKey(day))}
                        className="bg-gray-100 rounded-full p-2 pointer-events-auto hover:bg-gray-200"
                       >
                         <Plus size={20} className="text-gray-400" />
                       </button>
                    </div>

                    {cellShifts.map(shift => (
                      <div key={shift.id} className="bg-white p-2 rounded border border-gray-200 shadow-sm relative z-10">
                        <div className="text-xs text-gray-500 mb-1 truncate">{shift.location}</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-1 ${getRoleColor(shift.role)}`}>
                          {shift.role}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                             {shift.startTime} - {shift.endTime}
                          </span>
                          {shift.status === ShiftStatus.LATE && (
                             <AlertTriangle size={14} className="text-red-500" />
                          )}
                        </div>
                         <div className="text-[10px] text-gray-400 mt-1">
                            ({shift.duration}h)
                         </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyTimetableView;
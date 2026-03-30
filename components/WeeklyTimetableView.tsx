import React from 'react';
import { Clock, Plus, AlertTriangle, DollarSign, X } from 'lucide-react';
import { Employee, Shift, ShiftStatus } from '../types';

interface WeeklyTimetableViewProps {
  shifts: Shift[];
  employees: Employee[];
  currentDate: Date;
  onAddShift: (employeeId: string, date: string, type?: 'MORNING' | 'DINNER' | 'LUNCH') => void;
  onDeleteShift: (shiftId: string) => void;
}

const WeeklyTimetableView: React.FC<WeeklyTimetableViewProps> = ({ shifts, employees, currentDate, onAddShift, onDeleteShift }) => {
  
  const parseTimeToHours = (t: string) => {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h + (m / 60);
  };

  const getWeekDays = (baseDate: Date) => {
    const days = [];
    const startOfWeek = new Date(baseDate);
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

  const getShiftsForCell = (employeeId: string, date: Date, type: 'MORNING' | 'DINNER') => {
    const dateKey = formatDateKey(date);
    return shifts.filter(s => {
      const isMatch = s.employeeId === employeeId && s.date === dateKey;
      if (!isMatch) return false;
      
      // Handle special labels for TAN
      if (s.startTime === 'L' || s.startTime === 'D') {
        return type === 'DINNER';
      }

      // Categorize based on start time or role/name
      const startHour = parseInt(s.startTime.split(':')[0]);
      if (type === 'MORNING') return startHour < 15;
      if (type === 'DINNER') return startHour >= 15;
      return false;
    });
  };

  const calculateTotalHours = (employeeId: string, filter?: (s: Shift) => boolean) => {
    if (employeeId === '3') return '-'; // No need to calculate hour for Tan
    const empShifts = shifts.filter(s => s.employeeId === employeeId && (!filter || filter(s)));
    
    // If any shift is "open" (blank endTime), don't calculate total
    if (empShifts.some(s => s.endTime === '')) return '-';
    
    const total = empShifts.reduce((acc, s) => acc + s.duration, 0);
    return total > 0 ? total.toFixed(2) : '-';
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-auto text-[10px] font-sans">
      <table className="min-w-max border-collapse border border-gray-400">
        <thead className="sticky top-0 z-20 bg-gray-100">
          <tr>
            <th rowSpan={2} className="border border-gray-400 p-1 w-32 bg-gray-200">
              {weekDays[0].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-20 bg-gray-200 uppercase">Date</th>
            {weekDays.map((day, idx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <th key={idx} colSpan={3} className={`border border-gray-400 p-1 uppercase font-bold ${isWeekend ? 'bg-orange-100 text-orange-800' : 'bg-green-50 text-green-800'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  <div className={`text-[9px] font-normal ${isWeekend ? 'text-orange-500/70' : 'text-gray-500'}`}>{day.getDate()}-{day.toLocaleDateString('en-US', { month: 'short' })}</div>
                </th>
              );
            })}
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase">Week</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-orange-100 text-orange-800 uppercase">Sat</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-orange-100 text-orange-800 uppercase">Sun</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase font-bold">Total</th>
          </tr>
          <tr>
            {weekDays.map((day, idx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <React.Fragment key={idx}>
                  <th className={`border border-gray-400 p-0.5 w-10 text-[8px] ${isWeekend ? 'bg-orange-50/50' : 'bg-gray-50'}`}>IN</th>
                  <th className={`border border-gray-400 p-0.5 w-10 text-[8px] ${isWeekend ? 'bg-orange-50/50' : 'bg-gray-50'}`}>OUT</th>
                  <th className={`border border-gray-400 p-0.5 w-10 text-[8px] ${isWeekend ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>HOUR</th>
                </React.Fragment>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            return (
              <React.Fragment key={employee.id}>
                {/* MORNING ROW */}
                <tr className="hover:bg-gray-50 group">
                  <td rowSpan={3} className="border border-gray-400 p-2 font-bold bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span className="uppercase text-sm">{employee.name}</span>
                      <span className="text-[8px] text-gray-400 font-normal">{employee.defaultRole}</span>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1 font-bold text-blue-700 bg-blue-50/30 uppercase">Morning</td>
                  {weekDays.map((day, idx) => {
                    const morningShifts = getShiftsForCell(employee.id, day, 'MORNING');
                    const shift = morningShifts[0];
                    return (
                      <React.Fragment key={idx}>
                        <td className="border border-gray-400 p-1 text-center relative group/cell">
                          {shift ? (
                            <div className="relative group/shift">
                              <div className="font-bold">
                                {shift.startTime}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteShift(shift.id);
                                }}
                                className="absolute -top-1 -right-1 opacity-0 group-hover/shift:opacity-100 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-all z-20 shadow-sm no-export"
                                title="Clear Shift"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => onAddShift(employee.id, formatDateKey(day), 'MORNING')}
                              className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 bg-green-500/10 flex items-center justify-center no-export"
                            >
                              <Plus size={10} className="text-green-600" />
                            </button>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center">
                          {shift && (
                            <div>
                              {shift.endTime || ((employee.id === '1' || employee.id === '9' || employee.id === '3') ? 'OPEN' : '')}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20">
                          {shift && shift.duration > 0 ? shift.duration.toFixed(2) : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">{calculateTotalHours(employee.id)}</td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">
                    {calculateTotalHours(employee.id, (s) => new Date(s.date).getDay() === 6)}
                  </td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">
                    {calculateTotalHours(employee.id, (s) => new Date(s.date).getDay() === 0)}
                  </td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-green-50 text-green-800 text-xs">{calculateTotalHours(employee.id)}</td>
                </tr>
                
                {/* LUNCH BREAK ROW */}
                <tr className="bg-gray-50/30 text-[8px] italic text-gray-500">
                  <td className="border border-gray-400 p-1 text-red-600 font-medium uppercase">Lunch break</td>
                  {weekDays.map((day, idx) => {
                    const morningShifts = getShiftsForCell(employee.id, day, 'MORNING');
                    const shift = morningShifts[0];
                    let showBreak = false;
                    if (employee.id !== '3' && shift) {
                      const start = parseTimeToHours(shift.startTime);
                      let end = parseTimeToHours(shift.endTime);
                      if (end < start) end += 24;
                      if ((end - start) > 7) {
                        showBreak = true;
                      }
                    }
                    return (
                      <React.Fragment key={idx}>
                        <td colSpan={3} className="border border-gray-400 p-0.5 text-center">
                          {showBreak ? 'less 30 min break' : ''}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>

                {/* DINNER ROW */}
                <tr className="hover:bg-gray-50 group">
                  <td className="border border-gray-400 p-1 font-bold text-orange-700 bg-orange-50/30 uppercase">Dinner</td>
                  {weekDays.map((day, idx) => {
                    const dinnerShifts = getShiftsForCell(employee.id, day, 'DINNER');
                    const shift = dinnerShifts[0];
                    return (
                      <React.Fragment key={idx}>
                        <td className="border border-gray-400 p-1 text-center relative group/cell">
                          {shift ? (
                            <div className="relative group/shift">
                              <div className="font-bold">
                                {shift.startTime}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteShift(shift.id);
                                }}
                                className="absolute -top-1 -right-1 opacity-0 group-hover/shift:opacity-100 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-all z-20 shadow-sm no-export"
                                title="Clear Shift"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => onAddShift(employee.id, formatDateKey(day), 'DINNER')}
                              className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 bg-green-500/10 flex items-center justify-center no-export"
                            >
                              <Plus size={10} className="text-green-600" />
                            </button>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center">
                          {shift && (
                            <div>
                              {shift.endTime || ((employee.id === '1' || employee.id === '9' || employee.id === '3') ? 'OPEN' : '')}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20">
                          {employee.id === '3' ? '-' : (shift && shift.duration > 0 ? shift.duration.toFixed(2) : '-')}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                
                {/* Spacer row */}
                <tr className="h-2 bg-gray-200">
                  <td colSpan={27} className="border-none"></td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyTimetableView;
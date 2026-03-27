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
      
      // Categorize based on start time or role/name
      const startHour = parseInt(s.startTime.split(':')[0]);
      if (type === 'MORNING') return startHour < 15;
      if (type === 'DINNER') return startHour >= 15;
      return false;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetEmployeeId: string, date: Date, type?: 'MORNING' | 'DINNER' | 'LUNCH') => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'employee') {
        onAddShift(data.id, formatDateKey(date), type);
      }
    } catch (err) {}
  };

  const calculateTotalHours = (employeeId: string, filter?: (s: Shift) => boolean) => {
    const empShifts = shifts.filter(s => s.employeeId === employeeId && (!filter || filter(s)));
    return empShifts.reduce((acc, s) => acc + s.duration, 0).toFixed(2);
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
            {weekDays.map((day, idx) => (
              <th key={idx} colSpan={3} className="border border-gray-400 p-1 bg-green-50 text-green-800 uppercase font-bold">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                <div className="text-[9px] font-normal text-gray-500">{day.getDate()}-{day.toLocaleDateString('en-US', { month: 'short' })}</div>
              </th>
            ))}
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase">Week</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase">Sat</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase">Sun</th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-12 bg-gray-200 uppercase font-bold">Total</th>
          </tr>
          <tr>
            {weekDays.map((_, idx) => (
              <React.Fragment key={idx}>
                <th className="border border-gray-400 p-0.5 w-10 text-[8px] bg-gray-50">IN</th>
                <th className="border border-gray-400 p-0.5 w-10 text-[8px] bg-gray-50">OUT</th>
                <th className="border border-gray-400 p-0.5 w-10 text-[8px] bg-green-100 text-green-700">HOUR</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            return (
              <React.Fragment key={employee.id}>
                {/* MORNING ROW */}
                <tr className="hover:bg-gray-50 group">
                  <td rowSpan={3} className="border border-gray-400 p-2 font-bold bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'employee', id: employee.id }));
                      }}
                      className="cursor-grab active:cursor-grabbing flex flex-col"
                    >
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
                        <td 
                          className="border border-gray-400 p-1 text-center relative group/cell"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, employee.id, day, 'MORNING')}
                        >
                          {shift ? (
                            <div className="relative group/shift">
                              <div 
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shift', id: shift.id }));
                                }}
                                className="cursor-grab active:cursor-grabbing hover:text-green-600 transition-colors font-bold"
                              >
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
                            <div 
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shift', id: shift.id }));
                              }}
                              className="cursor-grab active:cursor-grabbing hover:text-green-600 transition-colors"
                            >
                              {shift.endTime}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20">{shift?.duration || ''}</td>
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
                    const showBreak = shift && 
                      (shift.startTime === '06:00' || shift.startTime === '06:30') && 
                      (shift.endTime === '14:00' || shift.endTime === '15:00');
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
                        <td 
                          className="border border-gray-400 p-1 text-center relative group/cell"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, employee.id, day, 'DINNER')}
                        >
                          {shift ? (
                            <div className="relative group/shift">
                              <div 
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shift', id: shift.id }));
                                }}
                                className="cursor-grab active:cursor-grabbing hover:text-green-600 transition-colors font-bold"
                              >
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
                            <div 
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shift', id: shift.id }));
                              }}
                              className="cursor-grab active:cursor-grabbing hover:text-green-600 transition-colors"
                            >
                              {shift.endTime}
                            </div>
                          )}
                        </td>
                        <td className="border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20">{shift?.duration || ''}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                
                {/* Spacer row */}
                <tr className="h-2 bg-gray-200">
                  <td colSpan={26} className="border-none"></td>
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
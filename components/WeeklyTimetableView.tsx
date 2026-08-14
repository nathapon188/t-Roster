import React from 'react';
import { Clock, Plus, AlertTriangle, DollarSign, X, GripVertical } from 'lucide-react';
import { Employee, Shift, ShiftStatus, DbClosedDate, StaffGroup } from '../types';
import { STAFF_GROUP_LABELS } from '../constants';

interface WeeklyTimetableViewProps {
  shifts: Shift[];
  employees: Employee[];
  currentDate: Date;
  onAddShift: (employeeId: string, date: string, type?: 'MORNING' | 'DINNER' | 'LUNCH') => void;
  onDeleteShift: (shiftId: string) => void;
  showOnlyWorking?: boolean;
  closedDates?: DbClosedDate[];
  onToggleClosedDate?: (date: string) => void;
  onReorderStaff?: (orderedIds: string[], groups: Record<string, StaffGroup>) => void;
}

const GROUPS: StaffGroup[] = ['kitchen', 'floor'];

const WeeklyTimetableView: React.FC<WeeklyTimetableViewProps> = ({
  shifts,
  employees,
  currentDate,
  onAddShift,
  onDeleteShift,
  showOnlyWorking,
  closedDates = [],
  onToggleClosedDate,
  onReorderStaff
}) => {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dropHint, setDropHint] = React.useState<string | null>(null);

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
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const formatDateKey = (date: Date) => toLocalDateString(date);
  const weekDateKeys = weekDays.map(d => formatDateKey(d));

  const filteredEmployees = showOnlyWorking
    ? employees.filter(emp => {
        const dateKey = formatDateKey(currentDate);
        return shifts.some(s => s.employeeId === emp.id && s.date === dateKey);
      })
    : employees;

  // Kitchen above the line, Floor below, each keeping its saved row order.
  const sections = GROUPS.map(group => ({
    group,
    rows: filteredEmployees.filter(emp => emp.group === group)
  }));

  // Reordering works on the full staff list, not the filtered one, so anyone
  // hidden by "only working" is not dropped out of the saved order.
  const fullOrder = () => GROUPS.flatMap(g => employees.filter(e => e.group === g).map(e => e.id));

  const endDrag = () => {
    setDragId(null);
    setDropHint(null);
  };

  /** Drop onto another row: land next to it, and take on that row's group. */
  const dropOnRow = (targetId: string, targetGroup: StaffGroup) => {
    if (!onReorderStaff || !dragId || dragId === targetId) return endDrag();

    const order = fullOrder();
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return endDrag();

    const next = order.filter(id => id !== dragId);
    // Dragging downwards lands after the target, upwards lands before it.
    next.splice(next.indexOf(targetId) + (from < to ? 1 : 0), 0, dragId);

    onReorderStaff(next, { [dragId]: targetGroup });
    endDrag();
  };

  /** Drop onto a group heading: move to the top of that group. */
  const dropOnGroup = (group: StaffGroup) => {
    if (!onReorderStaff || !dragId) return endDrag();

    const order = fullOrder();
    const next = order.filter(id => id !== dragId);
    const firstOfGroup = employees.find(e => e.group === group && e.id !== dragId);
    const at = firstOfGroup ? next.indexOf(firstOfGroup.id) : next.length;
    next.splice(at < 0 ? next.length : at, 0, dragId);

    onReorderStaff(next, { [dragId]: group });
    endDrag();
  };

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

  const calculateTotalHours = (employeeId: string, dayIndices?: number[]) => {
    if (employeeId === '3') return '-'; // No need to calculate hour for Tan
    
    // Filter shifts belonging to this employee AND this specific week
    const empShifts = shifts.filter(s => {
      const isEmployee = s.employeeId === employeeId;
      const isInWeek = weekDateKeys.includes(s.date);
      
      if (!isEmployee || !isInWeek) return false;
      
      // If dayIndices provided, further filter by those specific days (0=Mon, 6=Sun)
      if (dayIndices) {
        const shiftDayIndex = weekDateKeys.indexOf(s.date);
        return dayIndices.includes(shiftDayIndex);
      }
      
      return true;
    });
    
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
            <th rowSpan={2} className="border border-gray-400 p-1 w-32 bg-gray-200 sticky left-0 z-30">
              {weekDays[0].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </th>
            <th rowSpan={2} className="border border-gray-400 p-1 w-20 bg-gray-200 uppercase sticky left-32 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Date</th>
            {weekDays.map((day, idx) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const dateKey = formatDateKey(day);
              const isClosed = closedDates.some(d => d.date === dateKey);
              return (
                <th key={idx} colSpan={3} className={`border border-gray-400 p-1 uppercase font-bold ${isClosed ? 'bg-red-100 text-red-800' : (isWeekend ? 'bg-orange-100 text-orange-800' : 'bg-green-50 text-green-800')}`}>
                  <div className="flex flex-col items-center">
                    <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <div className={`text-[9px] font-normal ${isClosed ? 'text-red-500/70' : (isWeekend ? 'text-orange-500/70' : 'text-gray-500')}`}>
                      {day.getDate()}-{day.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    {onToggleClosedDate && (
                      <button 
                        onClick={() => onToggleClosedDate(dateKey)}
                        className={`mt-1 px-1 rounded text-[7px] border transition-colors no-export ${
                          isClosed 
                            ? 'bg-red-600 text-white border-red-600' 
                            : 'bg-white text-gray-400 border-gray-300 hover:border-red-400 hover:text-red-400'
                        }`}
                      >
                        {isClosed ? 'CLOSED' : 'OPEN'}
                      </button>
                    )}
                  </div>
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
          {sections.map(section => (
            <React.Fragment key={section.group}>
              {/* GROUP DIVIDER: also a drop target, so a row can be moved between Kitchen and Floor */}
              <tr
                onDragOver={e => { if (dragId) { e.preventDefault(); setDropHint(`group:${section.group}`); } }}
                onDrop={() => dropOnGroup(section.group)}
              >
                <td
                  colSpan={27}
                  className={`border-y-2 border-gray-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wider sticky left-0 transition-colors ${
                    dropHint === `group:${section.group}` ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {STAFF_GROUP_LABELS[section.group]}
                  {section.rows.length === 0 && <span className="ml-2 font-normal normal-case text-gray-500">(nobody here yet)</span>}
                </td>
              </tr>

              {section.rows.map((employee) => {
            return (
              <React.Fragment key={employee.id}>
                {/* MORNING ROW */}
                <tr className={`hover:bg-gray-50 group ${dragId === employee.id ? 'opacity-40' : ''}`}>
                  <td
                    rowSpan={3}
                    draggable={Boolean(onReorderStaff)}
                    onDragStart={e => {
                      setDragId(employee.id);
                      e.dataTransfer.effectAllowed = 'move';
                      // Firefox needs something on the transfer or the drag never starts.
                      e.dataTransfer.setData('text/plain', employee.id);
                    }}
                    onDragEnd={endDrag}
                    onDragOver={e => { if (dragId && dragId !== employee.id) { e.preventDefault(); setDropHint(employee.id); } }}
                    onDrop={() => dropOnRow(employee.id, employee.group)}
                    className={`border border-gray-400 p-2 font-bold bg-white sticky left-0 z-10 group-hover:bg-gray-50 transition-colors ${
                      onReorderStaff ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${dropHint === employee.id ? 'bg-green-100 outline outline-2 outline-green-500' : ''}`}
                    title={onReorderStaff ? 'Drag to reorder, or across the line to change group' : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {onReorderStaff && <GripVertical size={12} className="text-gray-300 shrink-0 no-export" />}
                      <div className="flex flex-col">
                        <span className="uppercase text-sm">{employee.name}</span>
                        <span className="text-[8px] text-gray-400 font-normal">{employee.defaultRole}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border border-gray-400 p-1 font-bold text-blue-700 bg-blue-50 uppercase sticky left-32 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-blue-100 transition-colors">Morning</td>
                  {weekDays.map((day, idx) => {
                    const morningShifts = getShiftsForCell(employee.id, day, 'MORNING');
                    const shift = morningShifts[0];
                    const isClosed = closedDates.some(d => d.date === formatDateKey(day));
                    return (
                      <React.Fragment key={idx}>
                        <td className={`border border-gray-400 p-1 text-center relative group/cell ${isClosed ? 'bg-red-50/50' : ''}`}>
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
                          ) : isClosed ? (
                            <span className="text-[7px] text-red-300 font-bold uppercase">Closed</span>
                          ) : (
                            <button 
                              onClick={() => onAddShift(employee.id, formatDateKey(day), 'MORNING')}
                              className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 bg-green-500/10 flex items-center justify-center no-export"
                            >
                              <Plus size={10} className="text-green-600" />
                            </button>
                          )}
                        </td>
                        <td className={`border border-gray-400 p-1 text-center ${isClosed ? 'bg-red-50/50' : ''}`}>
                          {shift && (
                            <div>
                              {shift.endTime || ((employee.id === '1' || employee.id === '9' || employee.id === '3') ? 'OPEN' : '')}
                            </div>
                          )}
                        </td>
                        <td className={`border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20 ${isClosed ? 'bg-red-100/20' : ''}`}>
                          {shift && shift.duration > 0 ? shift.duration.toFixed(2) : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">
                    {calculateTotalHours(employee.id, [0, 1, 2, 3, 4])}
                  </td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">
                    {calculateTotalHours(employee.id, [5])}
                  </td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-gray-50">
                    {calculateTotalHours(employee.id, [6])}
                  </td>
                  <td rowSpan={3} className="border border-gray-400 p-1 text-center font-bold bg-green-50 text-green-800 text-xs">
                    {calculateTotalHours(employee.id)}
                  </td>
                </tr>
                
                {/* LUNCH BREAK ROW */}
                <tr className="bg-gray-50/30 text-[8px] italic text-gray-500">
                  <td className="border border-gray-400 p-1 text-red-600 font-medium uppercase sticky left-32 z-10 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-100 transition-colors">Lunch break</td>
                  {weekDays.map((day, idx) => {
                    const morningShifts = getShiftsForCell(employee.id, day, 'MORNING');
                    const dinnerShifts = getShiftsForCell(employee.id, day, 'DINNER');
                    const mShift = morningShifts[0];
                    const dShift = dinnerShifts[0];
                    
                    const showBreak = (mShift && mShift.hasBreak) || (dShift && dShift.hasBreak);
                    
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
                  <td className="border border-gray-400 p-1 font-bold text-orange-700 bg-orange-50 uppercase sticky left-32 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-orange-100 transition-colors">Dinner</td>
                  {weekDays.map((day, idx) => {
                    const dinnerShifts = getShiftsForCell(employee.id, day, 'DINNER');
                    const shift = dinnerShifts[0];
                    const isClosed = closedDates.some(d => d.date === formatDateKey(day));
                    return (
                      <React.Fragment key={idx}>
                        <td className={`border border-gray-400 p-1 text-center relative group/cell ${isClosed ? 'bg-red-50/50' : ''}`}>
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
                          ) : isClosed ? (
                            <span className="text-[7px] text-red-300 font-bold uppercase">Closed</span>
                          ) : (
                            <button 
                              onClick={() => onAddShift(employee.id, formatDateKey(day), 'DINNER')}
                              className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 bg-green-500/10 flex items-center justify-center no-export"
                            >
                              <Plus size={10} className="text-green-600" />
                            </button>
                          )}
                        </td>
                        <td className={`border border-gray-400 p-1 text-center ${isClosed ? 'bg-red-50/50' : ''}`}>
                          {shift && (
                            <div>
                              {shift.endTime || ((employee.id === '1' || employee.id === '9' || employee.id === '3') ? 'OPEN' : '')}
                            </div>
                          )}
                        </td>
                        <td className={`border border-gray-400 p-1 text-center font-bold text-green-700 bg-green-50/20 ${isClosed ? 'bg-red-100/20' : ''}`}>
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
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyTimetableView;
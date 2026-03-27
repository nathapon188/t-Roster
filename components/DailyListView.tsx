import React from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Employee, Shift, ShiftStatus } from '../types';

interface DailyListViewProps {
  shifts: Shift[];
  employees: Employee[];
  currentDate: Date;
  onChangeDate: (delta: number) => void;
  onEditShift: (shift: Shift) => void;
  onAddShift: (employeeId: string, date: string, type?: 'MORNING' | 'DINNER' | 'LUNCH') => void;
  onDeleteShift: (shiftId: string) => void;
}

const DailyListView: React.FC<DailyListViewProps> = ({ shifts, employees, currentDate, onChangeDate, onEditShift, onAddShift, onDeleteShift }) => {
  
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'employee') {
        onAddShift(data.id, currentDate.toISOString());
      }
    } catch (err) {}
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Date Navigator */}
      <div className="bg-green-600 px-4 py-3 flex items-center justify-between text-white shadow-md z-10 sticky top-0">
        <button 
          onClick={() => onChangeDate(-1)}
          className="p-1 rounded-full hover:bg-green-700 transition"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="font-semibold text-lg">
          {isToday(currentDate) ? "Today" : formatDate(currentDate)}
        </span>
        <button 
          onClick={() => onChangeDate(1)}
          className="p-1 rounded-full hover:bg-green-700 transition"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* List Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 pb-24"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {shifts.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No shifts scheduled for this day.</p>
            <p className="text-sm mt-2">Drag a staff member here to add a shift.</p>
          </div>
        ) : (
          shifts.map((shift) => {
            const employee = getEmployee(shift.employeeId);
            if (!employee) return null;

            const isLate = shift.status === ShiftStatus.LATE;

            return (
              <div 
                key={shift.id} 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'shift', id: shift.id }));
                }}
                onClick={() => onEditShift(shift)}
                className={`bg-white rounded-lg shadow-sm border-l-8 p-4 flex items-center cursor-grab active:cursor-grabbing hover:shadow-md transition active:scale-[0.99] ${isLate ? 'border-red-500' : 'border-green-600'}`}
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
                    {shift.startTime} - {shift.endTime}
                  </p>
                  <div className="flex items-center gap-2">
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
    </div>
  );
};

export default DailyListView;
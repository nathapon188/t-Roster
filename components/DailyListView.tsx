import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Employee, Shift, ShiftStatus } from '../types';
import { EMPLOYEES } from '../constants';

interface DailyListViewProps {
  shifts: Shift[];
  currentDate: Date;
  onChangeDate: (delta: number) => void;
  onEditShift: (shift: Shift) => void;
}

const DailyListView: React.FC<DailyListViewProps> = ({ shifts, currentDate, onChangeDate, onEditShift }) => {
  
  const getEmployee = (id: string) => EMPLOYEES.find(e => e.id === id);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {shifts.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No shifts scheduled for this day.</p>
          </div>
        ) : (
          shifts.map((shift) => {
            const employee = getEmployee(shift.employeeId);
            if (!employee) return null;

            const isLate = shift.status === ShiftStatus.LATE;

            return (
              <div 
                key={shift.id} 
                onClick={() => onEditShift(shift)}
                className={`bg-white rounded-xl shadow-sm border-l-4 p-4 flex items-center cursor-pointer hover:shadow-md transition active:scale-[0.99] ${isLate ? 'border-red-500' : 'border-green-500'}`}
              >
                {/* Initials Avatar */}
                <div className="mr-4 flex-shrink-0">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${employee.color}`}>
                    {employee.initials}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg truncate">{employee.name}</h3>
                  <p className="text-gray-500 text-sm truncate">{shift.location}</p>
                  <p className="text-gray-500 text-sm truncate">{shift.role}</p>
                </div>

                {/* Time & Status */}
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-bold text-gray-800 text-lg tabular-nums">
                    {shift.startTime} - {shift.endTime}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(currentDate)}</p>
                  <p className={`text-xs font-semibold mt-1 ${isLate ? 'text-red-500' : 'text-gray-400'}`}>
                    {shift.status}
                  </p>
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
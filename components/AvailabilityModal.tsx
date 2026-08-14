import React from 'react';
import { X, CalendarX } from 'lucide-react';
import { Employee, DbStaffAvailability, DbShiftDefinition } from '../types';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  availability: DbStaffAvailability[];
  shiftDefinitions: DbShiftDefinition[];
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({ 
  isOpen, onClose, employees, availability, shiftDefinitions 
}) => {
  if (!isOpen) return null;

  const getDayName = (dayId: number) => {
    // constant.ts DAY_MAP: 1=Mon... 7=Sun.
    const map: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' };
    return map[dayId] || 'Unknown';
  };

  const getShiftName = (shiftId: number) => {
    return shiftDefinitions.find(s => s.shift_id === shiftId)?.shift_name || 'Unknown Shift';
  };

  // Filter out the 'Open Shifts' dummy user
  const realEmployees = employees.filter(e => e.id !== '999');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center text-white shrink-0">
           <h2 className="font-bold text-lg flex items-center gap-2">
             <CalendarX size={20} className="text-red-400" /> Staff Unavailability
           </h2>
           <button onClick={onClose} className="hover:bg-gray-700 rounded-full p-1 transition"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-gray-50">
           <div className="space-y-4">
             {realEmployees.map(emp => {
               // Find unavailable rules for this employee
               const empAvail = availability.filter(a => a.staff_id.toString() === emp.id && a.is_available === 0);
               
               return (
                 <div key={emp.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.color}`}>
                          {emp.initials}
                       </div>
                       <h3 className="font-bold text-gray-800 text-lg">{emp.name}</h3>
                    </div>
                    
                    {empAvail.length === 0 ? (
                      <div className="ml-11 flex items-center text-green-600 text-sm gap-2">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span>
                         Fully Available
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-11">
                        {empAvail.map(a => (
                          <div key={a.availability_id} className="bg-red-50 border border-red-100 rounded px-3 py-2 flex flex-col">
                               <div className="flex items-center gap-2 font-semibold text-gray-700">
                                  <span>{getDayName(a.day_id)}</span>
                                  <span className="text-gray-300">|</span>
                                  <span>{getShiftName(a.shift_id)}</span>
                               </div>
                               {a.notes && <span className="text-xs text-red-500 mt-1 italic">"{a.notes}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )
             })}
           </div>
        </div>
      </div>
    </div>
  )
}
export default AvailabilityModal;
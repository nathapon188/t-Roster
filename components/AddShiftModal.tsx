import React from 'react';
import { X, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DbShiftDefinition, DbStaffAvailability, Employee } from '../types';
import { DAY_MAP } from '../constants';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftDefId: number, startTime?: string, endTime?: string, hasBreak?: boolean) => void;
  employee: Employee | null;
  date: Date;
  shiftDefinitions: DbShiftDefinition[];
  availability: DbStaffAvailability[];
  shiftType?: 'MORNING' | 'DINNER' | 'LUNCH';
}

const AddShiftModal: React.FC<AddShiftModalProps> = ({ 
  isOpen, onClose, onSave, employee, date, shiftDefinitions, availability, shiftType: initialShiftType
}) => {
  const [selectedStart, setSelectedStart] = React.useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = React.useState<string | null>(null);
  const [localShiftType, setLocalShiftType] = React.useState<'MORNING' | 'DINNER' | 'LUNCH' | null>(null);
  const [hasBreak, setHasBreak] = React.useState<boolean>(false);

  // Reset selection when modal opens or shiftType changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStart(null);
      setSelectedEnd(null);
      setLocalShiftType(initialShiftType || null);
      setHasBreak(false);
    }
  }, [isOpen, initialShiftType]);

  if (!isOpen || !employee) return null;

  const morningStarts = [
    '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', 
    '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', 
    '10:00', '10:15', '10:30', '10:45', '11:00'
  ];
  const morningEnds = [
    '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', 
    '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', 
    '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', 
    '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', 
    '15:00', '15:15', '15:30', '15:45', '16:00'
  ];
  
  const dinnerStarts = employee.id === '3' ? ['L', 'D'] : ['16:30', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00'];
  const dinnerEnds = employee.id === '3' ? ['L', 'D'] : [
    '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', 
    '20:00', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00', 
    '22:15', '22:30', '22:45', '23:00', '23:15', '23:30'
  ];

  const parseTimeToMinutes = (t: string) => {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatMinutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const adjustTime = (time: string, delta: number) => {
    if (time === 'L' || time === 'D') return time;
    const mins = parseTimeToMinutes(time);
    return formatMinutesToTime(mins + delta);
  };

  const getStartOptions = () => {
    if (localShiftType === 'MORNING') return morningStarts;
    if (localShiftType === 'DINNER') return dinnerStarts;
    return [];
  };

  const getEndOptions = () => {
    if (localShiftType === 'MORNING') {
      if (!selectedStart) return morningEnds;
      const startVal = parseTimeToMinutes(selectedStart);
      return morningEnds.filter(time => parseTimeToMinutes(time) > startVal);
    }
    if (localShiftType === 'DINNER') {
      if (!selectedStart || employee.id === '3') return dinnerEnds;
      const startVal = parseTimeToMinutes(selectedStart);
      return dinnerEnds.filter(time => parseTimeToMinutes(time) > startVal);
    }
    return [];
  };

  const startOptions = getStartOptions();
  const endOptions = getEndOptions();

  const handleSave = () => {
    const isSpecialEmployee = employee.id === '1' || employee.id === '9' || employee.id === '3';
    if (localShiftType && selectedStart && (selectedEnd || isSpecialEmployee)) {
      // Find matching shift definition if possible, or just pass custom times
      const defId = localShiftType === 'MORNING' ? 1 : (localShiftType === 'DINNER' ? 3 : 2);
      onSave(defId, selectedStart, selectedEnd || '', hasBreak);
    }
  };

  // Convert JS Date day (0-6) to DB Day ID
  const dayId = DAY_MAP[date.getDay()];
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Helper to check if unavailable for a specific shift
  const checkAvailability = (shiftId: number) => {
    // Find record for this staff, this day, this shift
    const rule = availability.find(r => r.day_id === dayId && r.shift_id === shiftId);
    
    // If rule exists and is_available == 0, then UNAVAILABLE
    if (rule && rule.is_available === 0) {
      return { available: false, reason: rule.notes || 'Unavailable' };
    }
    return { available: true };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Add Shift</h2>
            <p className="text-green-100 text-sm">{dateStr}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-green-700 rounded-full p-1 transition">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${employee.color.replace('text-', 'bg-').split(' ')[0]}`}>
               {employee.initials}
            </div>
            <div>
              <p className="text-sm text-gray-500">Assigning to</p>
              <h3 className="font-bold text-gray-800 text-lg">{employee.name}</h3>
            </div>
          </div>

          {localShiftType && (localShiftType === 'MORNING' || localShiftType === 'DINNER') ? (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Select Start Time</h4>
                  {selectedStart && selectedStart !== 'L' && selectedStart !== 'D' && (
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={() => setSelectedStart(adjustTime(selectedStart, -15))}
                        className="p-1 hover:bg-white rounded transition shadow-sm"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold w-12 text-center">{selectedStart}</span>
                      <button 
                        onClick={() => setSelectedStart(adjustTime(selectedStart, 15))}
                        className="p-1 hover:bg-white rounded transition shadow-sm"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {startOptions.map(time => (
                    <button
                      key={time}
                      onClick={() => {
                        setSelectedStart(time);
                        setSelectedEnd(null); // Reset end time when start changes
                      }}
                      className={`p-2 rounded-lg border-2 text-sm font-bold transition-all ${selectedStart === time ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {selectedStart && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Select Out Time</h4>
                    {selectedEnd && selectedEnd !== 'L' && selectedEnd !== 'D' && (
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button 
                          onClick={() => setSelectedEnd(adjustTime(selectedEnd, -15))}
                          className="p-1 hover:bg-white rounded transition shadow-sm"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold w-12 text-center">{selectedEnd}</span>
                        <button 
                          onClick={() => setSelectedEnd(adjustTime(selectedEnd, 15))}
                          className="p-1 hover:bg-white rounded transition shadow-sm"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {endOptions.map(time => (
                      <button
                        key={time}
                        onClick={() => setSelectedEnd(time)}
                        className={`p-2 rounded-lg border-2 text-sm font-bold transition-all ${selectedEnd === time ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-300'}`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <input 
                  type="checkbox" 
                  id="hasBreak" 
                  checked={hasBreak}
                  onChange={(e) => setHasBreak(e.target.checked)}
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="hasBreak" className="text-sm font-bold text-blue-800 cursor-pointer select-none">
                  Subtract 30-min break from total hours
                </label>
              </div>

              <button
                disabled={!selectedStart || (!selectedEnd && !(employee.id === '1' || employee.id === '9' || employee.id === '3'))}
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${selectedStart && (selectedEnd || (employee.id === '1' || employee.id === '9' || employee.id === '3')) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Save Shift
              </button>
            </div>
          ) : (
            <>
              <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Select Shift Time</h4>
              
              <div className="space-y-3">
                {shiftDefinitions.map((def) => {
                  const { available, reason } = checkAvailability(def.shift_id);
                  const formatTime = (t: string) => t.substring(0, 5);

                  return (
                    <button
                      key={def.shift_id}
                      onClick={() => {
                        const isSpecial = employee.id === '1' || employee.id === '9' || employee.id === '3';
                        if (isSpecial) {
                          if (def.shift_id === 1) setLocalShiftType('MORNING');
                          else if (def.shift_id === 3) setLocalShiftType('DINNER');
                          else onSave(def.shift_id);
                        } else {
                          onSave(def.shift_id);
                        }
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all group flex items-center justify-between
                        ${available 
                          ? 'border-gray-200 hover:border-green-500 hover:bg-green-50' 
                          : 'border-red-100 bg-red-50 opacity-90'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${available ? 'bg-gray-100 text-gray-600 group-hover:text-green-600' : 'bg-red-100 text-red-500'}`}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className={`font-bold ${available ? 'text-gray-800' : 'text-gray-500'}`}>
                            {def.shift_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatTime(def.start_time)} - {formatTime(def.end_time)}
                          </p>
                        </div>
                      </div>

                      {!available && (
                        <div className="flex flex-col items-end text-right">
                          <div className="flex items-center gap-1 text-red-600 font-semibold text-sm">
                            <AlertCircle size={14} />
                            <span>Unavailable</span>
                          </div>
                          {reason && <span className="text-xs text-red-400 mt-0.5 max-w-[120px] truncate">{reason}</span>}
                        </div>
                      )}

                      {available && (
                         <div className="opacity-0 group-hover:opacity-100 transition text-green-600">
                            <CheckCircle2 size={24} />
                         </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddShiftModal;
import React from 'react';
import { X, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DbShiftDefinition, DbStaffAvailability, Employee } from '../types';
import { DAY_MAP } from '../constants';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftDefId: number, startTime?: string, endTime?: string) => void;
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

  // Reset selection when modal opens or shiftType changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStart(null);
      setSelectedEnd(null);
      setLocalShiftType(initialShiftType || null);
    }
  }, [isOpen, initialShiftType]);

  if (!isOpen || !employee) return null;

  const morningStarts = ['06:00', '06:30', '07:00', '07:30', '10:30', '11:00'];
  const morningEnds = ['10:30', '11:00', '14:00', '15:00'];
  
  const dinnerStarts = employee.id === '7' ? ['L', 'D'] : ['16:30', '17:00'];
  const dinnerEnds = employee.id === '7' ? ['L', 'D'] : ['20:30', '21:00', '21:30'];

  const getStartOptions = () => {
    if (localShiftType === 'MORNING') return morningStarts;
    if (localShiftType === 'DINNER') return dinnerStarts;
    return [];
  };

  const getEndOptions = () => {
    if (localShiftType === 'MORNING') {
      if (selectedStart === '06:00' || selectedStart === '06:30' || selectedStart === '07:00' || selectedStart === '07:30') {
        return ['10:30', '11:00', '14:00', '15:00'];
      }
      if (selectedStart === '10:30' || selectedStart === '11:00') {
        return ['14:00', '15:00'];
      }
      return morningEnds;
    }
    if (localShiftType === 'DINNER') return dinnerEnds;
    return [];
  };

  const startOptions = getStartOptions();
  const endOptions = getEndOptions();

  const handleSave = () => {
    if (localShiftType && selectedStart && selectedEnd) {
      // Find matching shift definition if possible, or just pass custom times
      const defId = localShiftType === 'MORNING' ? 1 : (localShiftType === 'DINNER' ? 3 : 2);
      onSave(defId, selectedStart, selectedEnd);
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
                <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Select Start Time</h4>
                <div className="grid grid-cols-3 gap-2">
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
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wider">Select Out Time</h4>
                  <div className="grid grid-cols-3 gap-2">
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

              <button
                disabled={!selectedStart || !selectedEnd}
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${selectedStart && selectedEnd ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
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
                        if (employee.id === '7' && def.shift_id === 3) {
                          setLocalShiftType('DINNER');
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
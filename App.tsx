import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Plus, Download, LayoutList, CalendarDays, Database, Loader2, Wifi, WifiOff, CalendarX, Save } from 'lucide-react';
import DailyListView from './components/DailyListView';
import WeeklyTimetableView from './components/WeeklyTimetableView';
import ExportModal from './components/ExportModal';
import AddShiftModal from './components/AddShiftModal';
import AvailabilityModal from './components/AvailabilityModal';
import { ViewMode, Shift, Employee, DbShiftDefinition, DbStaffAvailability, ShiftStatus } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Refs
  const contentRef = React.useRef<HTMLElement | null>(null);

  // Data
  const [shiftDefinitions, setShiftDefinitions] = useState<DbShiftDefinition[]>([]);
  const [availability, setAvailability] = useState<DbStaffAvailability[]>([]); // Used for Add Modal (single user)
  const [allAvailability, setAllAvailability] = useState<DbStaffAvailability[]>([]); // Used for Availability Modal (all users)
  
  const [pendingShiftData, setPendingShiftData] = useState<{empId: string, date: Date, type?: 'MORNING' | 'DINNER' | 'LUNCH'} | null>(null);

  const handleDeleteShift = async (shiftId: string) => {
    try {
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      await db.deleteShift(shiftId);
    } catch (e) {
      alert("Failed to delete shift");
      // Re-fetch to restore state if needed, but optimistic UI is usually fine
      const rosterData = await db.getShifts();
      setShifts(rosterData);
    }
  };

  // Database States
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Database Connection and Data Fetch
  useEffect(() => {
    const initDatabase = async () => {
      try {
        setLoading(true);
        await db.connect();
        setDbConnected(true);
        
        // Fetch Reference Data
        const staffData = await db.getEmployees();
        const defs = await db.getShiftDefinitions();
        setEmployees(staffData);
        setShiftDefinitions(defs);

        // Fetch Roster Data
        const rosterData = await db.getShifts();
        setShifts(rosterData);

      } catch (err) {
        console.error(err);
        setError("Failed to initialize database");
      } finally {
        setLoading(false);
      }
    };

    initDatabase();
  }, []);

  // Filter shifts based on current view
  const filteredShifts = shifts.filter(shift => {
    if (viewMode === 'daily') {
      const shiftDate = shift.date; // YYYY-MM-DD
      const current = currentDate.toISOString().split('T')[0];
      return shiftDate === current;
    }
    // For weekly, we pass all and let the component handle grid placement
    return true; 
  });

  const handleDateChange = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentDate(newDate);
  };

  // Step 1: User clicks + button -> Open Modal and Fetch Availability for that user
  const handleOpenAddShift = async (employeeId: string, dateStr: string, type?: 'MORNING' | 'DINNER' | 'LUNCH') => {
    if (!dbConnected) {
      alert("Cannot add shift: Database disconnected");
      return;
    }

    const date = new Date(dateStr);
    const avail = await db.getStaffAvailability(parseInt(employeeId));
    setAvailability(avail);
    
    setPendingShiftData({ empId: employeeId, date, type });
    setIsAddModalOpen(true);
  };

  // Open the global availability view
  const handleOpenAvailabilityMap = async () => {
    const allAvail = await db.getAllStaffAvailability();
    setAllAvailability(allAvail);
    setIsAvailabilityModalOpen(true);
  };

  // Step 2: User selects shift type in Modal -> Save
  const handleSaveShift = async (shiftDefId: number, startTime?: string, endTime?: string) => {
    if (!pendingShiftData) return;

    const { empId, date } = pendingShiftData;
    const dateStr = date.toISOString().split('T')[0];
    const def = shiftDefinitions.find(d => d.shift_id === shiftDefId);

    const isSpecial = empId === '1' || empId === '9' || empId === '7';
    const newShift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: empId,
      startTime: startTime || def?.start_time.substring(0, 5) || '00:00',
      endTime: endTime !== undefined ? endTime : (isSpecial ? '' : (def?.end_time.substring(0, 5) || '00:00')),
      date: dateStr,
      location: 'Taringa',
      role: 'Staff', // Defaulting for now
      status: 'Draft' as any,
      duration: 0 
    };
    
    // Simple duration calc for optimistic UI
    const parseTimeToHours = (t: string) => {
      if (!t || !t.includes(':')) return 0;
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return 0;
      return h + (m / 60);
    };
    const start = parseTimeToHours(newShift.startTime);
    let end = parseTimeToHours(newShift.endTime);
    if (end < start && newShift.endTime !== '') end += 24;
    
    let duration = newShift.endTime === '' ? 0 : (end - start);
    // Subtract 30 mins if the shift is more than 7 hours
    if (duration > 7) {
      duration -= 0.5;
    }
    newShift.duration = duration;

    try {
      setShifts(prev => [...prev, newShift]);
      await db.addShift(newShift, shiftDefId, startTime, endTime);
      setIsAddModalOpen(false);
      setPendingShiftData(null);
      
      // Refresh to get real IDs and calculated durations
      const rosterData = await db.getShifts();
      setShifts(rosterData);
    } catch (e) {
      alert("Failed to save shift");
      setShifts(prev => prev.filter(s => s.id !== newShift.id));
    }
  };

  const handleClearWeek = async () => {
    if (!dbConnected) return;
    
    try {
      setLoading(true);
      // Get current week dates
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        weekDates.push(d.toISOString().split('T')[0]);
      }
      
      // Find all shifts in this week
      const shiftsToDelete = shifts.filter(s => weekDates.includes(s.date));
      
      // Delete them one by one (mock db handles it)
      for (const s of shiftsToDelete) {
        await db.deleteShift(s.id);
      }
      
      const rosterData = await db.getShifts();
      setShifts(rosterData);
    } catch (e) {
      alert("Failed to clear week");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!dbConnected) return;
    
    try {
      setLoading(true);
      // Get current week dates
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        weekDates.push(d);
      }
      
      await db.restoreFromTemplate(weekDates);
      const rosterData = await db.getShifts();
      setShifts(rosterData);
    } catch (e) {
      alert("Failed to restore shifts");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!dbConnected) return;
    
    try {
      setLoading(true);
      // Get current week dates
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      
      const weekDates: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        weekDates.push(d);
      }
      
      await db.saveWeekAsTemplate(weekDates);
      alert("Current week saved as default template!");
    } catch (e) {
      alert("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  // Calculate Date Range String for Header
  const getDateRangeString = () => {
    if (viewMode === 'daily') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100 text-gray-600">
         <Loader2 className="animate-spin mb-4 text-green-600" size={48} />
         <p className="font-medium">Loading Roster...</p>
      </div>
    );
  }

  const getPendingEmployee = () => {
    if (!pendingShiftData) return null;
    return employees.find(e => e.id === pendingShiftData.empId) || null;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100 max-w-[1600px] mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 h-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 text-green-600 rounded flex items-center justify-center">
            <Calendar size={20} />
          </div>
          <h1 className="text-xl font-bold text-green-600 tracking-tight">ROSTER</h1>
          <span className="text-gray-400 text-sm hidden sm:block">| {getDateRangeString()}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* View Toggles */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2">
             <button 
               onClick={() => setViewMode('daily')}
               className={`p-1.5 rounded-md transition ${viewMode === 'daily' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
               title="Daily List View"
             >
               <LayoutList size={18} />
             </button>
             <button 
               onClick={() => setViewMode('weekly')}
               className={`p-1.5 rounded-md transition ${viewMode === 'weekly' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
               title="Weekly Timetable View"
             >
               <CalendarDays size={18} />
             </button>
          </div>

          <button className="text-gray-500 hover:text-green-600 transition hidden sm:block">
            <Filter size={22} />
          </button>
          
          <button 
            onClick={handleOpenAvailabilityMap}
            className="text-gray-500 hover:text-red-500 transition relative"
            title="View Staff Unavailability"
          >
            <CalendarX size={22} />
          </button>

          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="text-gray-500 hover:text-green-600 transition"
            title="Export Roster"
          >
            <Download size={22} />
          </button>
          
          <button 
            onClick={handleSaveTemplate}
            className="text-gray-500 hover:text-blue-600 transition"
            title="Save Current Week as Default Template"
          >
            <Save size={22} />
          </button>

          <button 
            onClick={handleRestoreDefaults}
            className="text-gray-500 hover:text-blue-600 transition"
            title="Restore Shifts from Template"
          >
            <Database size={22} />
          </button>
          
          <button 
            onClick={handleClearWeek}
            className="text-gray-500 hover:text-red-600 transition"
            title="Clear All Shifts for this Week"
          >
            <CalendarX size={22} />
          </button>

          <button 
            // Default "Quick Add" to today's date and first employee if clicked from top
            onClick={() => handleOpenAddShift(employees[0]?.id || '1', new Date().toISOString())}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition shadow-lg"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <main ref={contentRef} className="flex-1 overflow-hidden relative">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <Database size={48} className="mb-4" />
              <p className="font-bold">{error}</p>
            </div>
          ) : viewMode === 'daily' ? (
            <DailyListView 
              shifts={filteredShifts}
              employees={employees}
              currentDate={currentDate} 
              onChangeDate={handleDateChange}
              onEditShift={(s) => console.log('Edit', s)}
              onAddShift={handleOpenAddShift}
              onDeleteShift={handleDeleteShift}
            />
          ) : (
            <WeeklyTimetableView 
              shifts={shifts}
              employees={employees}
              currentDate={currentDate}
              onAddShift={handleOpenAddShift}
              onDeleteShift={handleDeleteShift}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        rosterDateRange={getDateRangeString()}
        contentRef={contentRef}
      />

      <AddShiftModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveShift}
        employee={getPendingEmployee()}
        date={pendingShiftData?.date || new Date()}
        shiftDefinitions={shiftDefinitions}
        availability={availability}
        shiftType={pendingShiftData?.type}
      />

      <AvailabilityModal 
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        employees={employees}
        availability={allAvailability}
        shiftDefinitions={shiftDefinitions}
      />
    </div>
  );
};

export default App;
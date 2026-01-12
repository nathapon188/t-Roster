import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Plus, Share2, LayoutList, CalendarDays, Database, Loader2, Wifi, WifiOff } from 'lucide-react';
import DailyListView from './components/DailyListView';
import WeeklyTimetableView from './components/WeeklyTimetableView';
import ShareModal from './components/ShareModal';
import { ViewMode, Shift } from './types';
import { db } from './services/db';
import { DB_CONFIG } from './config';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
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
        const data = await db.getShifts();
        setShifts(data);
      } catch (err) {
        console.error(err);
        setError("Failed to connect to Google Cloud SQL");
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

  const handleAddShift = async (employeeId?: string, date?: string) => {
    if (!dbConnected) {
      alert("Cannot add shift: Database disconnected");
      return;
    }

    const newShift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: employeeId || 'open',
      startTime: '09:00',
      endTime: '17:00',
      date: date || currentDate.toISOString().split('T')[0],
      location: 'Bourke St Cafe',
      role: employeeId === 'open' ? 'Open Shift' as any : 'Manager' as any,
      status: 'Draft' as any,
      duration: 8
    };

    try {
      // Optimistic update
      setShifts(prev => [...prev, newShift]);
      // Persist to DB
      await db.addShift(newShift);
    } catch (e) {
      alert("Failed to save shift to database");
      // Rollback on error
      setShifts(prev => prev.filter(s => s.id !== newShift.id));
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
         <p className="font-medium">Connecting to Google Cloud SQL...</p>
         <p className="text-xs text-gray-400 mt-2 font-mono">{DB_CONFIG.host}</p>
      </div>
    );
  }

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
          
          {/* DB Status Indicator */}
          <div className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ml-4 border ${dbConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
             {dbConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
             <span>{dbConnected ? 'DB ONLINE' : 'DB OFFLINE'}</span>
          </div>
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

          <button className="text-gray-500 hover:text-green-600 transition">
            <Filter size={22} />
          </button>
          
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="text-gray-500 hover:text-green-600 transition"
            title="Share Roster"
          >
            <Share2 size={22} />
          </button>

          <button 
            onClick={() => handleAddShift()}
            className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition shadow-lg"
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-500">
            <Database size={48} className="mb-4" />
            <p className="font-bold">{error}</p>
            <p className="text-sm mt-2">Check credentials in config.ts</p>
          </div>
        ) : viewMode === 'daily' ? (
          <DailyListView 
            shifts={filteredShifts} 
            currentDate={currentDate} 
            onChangeDate={handleDateChange}
            onEditShift={(s) => console.log('Edit', s)}
          />
        ) : (
          <WeeklyTimetableView 
            shifts={shifts}
            currentDate={currentDate}
            onAddShift={handleAddShift}
          />
        )}
      </main>

      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        rosterDateRange={getDateRangeString()}
      />
    </div>
  );
};

export default App;
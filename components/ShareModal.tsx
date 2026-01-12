import React, { useState } from 'react';
import { X, Mail, Check, Copy } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterDateRange: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, rosterDateRange }) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock send
    setTimeout(() => {
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
        setEmail('');
      }, 2000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Mail size={20} /> Share Roster
          </h2>
          <button onClick={onClose} className="text-white hover:bg-green-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {isSent ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-pulse">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Sent Successfully!</h3>
              <p className="text-gray-500 mt-2">The roster for {rosterDateRange} has been emailed.</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Send the roster for <span className="font-semibold text-gray-800">{rosterDateRange}</span> to your staff or management.
              </p>
              
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                   <div className="flex items-center gap-2 text-sm text-gray-500">
                     <Copy size={14} /> <span>Copy public link</span>
                   </div>
                   <button type="button" className="text-green-600 text-sm font-semibold hover:underline">Copy</button>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md transition transform active:scale-95 flex justify-center items-center gap-2"
                  >
                    Send Email
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
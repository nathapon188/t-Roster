import React, { useState } from 'react';
import { X, Download, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterDateRange: string;
  contentRef: React.RefObject<HTMLElement | null>;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, rosterDateRange, contentRef }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleExportImage = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      // Small delay to ensure any hover states or transitions are settled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#f3f4f6', // Match bg-gray-100
        onclone: (clonedDoc) => {
          // You can modify the cloned document here if needed
          // e.g., hide elements that shouldn't be in the export
          const elementsToHide = clonedDoc.querySelectorAll('.no-export');
          elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');
        }
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Roster_${rosterDateRange.replace(/[^a-z0-9]/gi, '_')}.png`;
      link.click();
      
      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export roster. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Download size={20} /> Export Roster
          </h2>
          <button onClick={onClose} className="text-white hover:bg-green-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {exportComplete ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Export Complete!</h3>
              <p className="text-gray-500 mt-2">Your roster image has been downloaded.</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Export the roster for <span className="font-semibold text-gray-800">{rosterDateRange}</span> as an image to share with your staff via MMS or WhatsApp.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleExportImage}
                  disabled={isExporting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-lg shadow-md transition transform active:scale-95 flex justify-center items-center gap-3"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Generating Image...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={20} />
                      Save as Image (PNG)
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">
                  Tip: Images are best for sharing on iPhone
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

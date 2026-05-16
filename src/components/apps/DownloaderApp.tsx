import React from 'react';
import { DownloaderModal } from '../DownloaderModal';

// Web Desktop wrapper for DownloaderModal content
export const DownloaderApp: React.FC = () => {
    // We just render the content of DownloaderModal directly, skipping the backdrop since it's a window now.
    // However realistically I can just import DownloaderModal logic or reuse DownloaderModal but since DownloaderModal 
    // forces fixed inset-0, I will recreate the Downloader UI here inline to fit the window perfectly.
    
    // For MVP Web OS I'll just reuse the DownloaderModal but modify its styling, actually DownloaderModal
    // is currently fixed. Let's make a window-friendly version.
    return (
        <div className="w-full h-full relative">
            <DownloaderModal isOpen={true} onClose={() => {}} onRefreshGames={() => {}} inWindowMode={true} />
        </div>
    );
}

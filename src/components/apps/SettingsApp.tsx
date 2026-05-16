import React from 'react';
import { SettingsModal } from '../SettingsModal';

export const SettingsApp: React.FC = () => {
    return (
        <div className="w-full h-full relative bg-[#121212]">
            <SettingsModal isOpen={true} onClose={() => {}} inWindowMode={true} />
        </div>
    );
}



import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import HomeTab from './HomeTab';
import AppsTab from './AppsTab';
import MiscTab from './MiscTab';
import BusinessTab from './BusinessTab';
import BottomNav from './BottomNav';

const MMO_START_TIME = new Date('2026-07-01T00:00:00Z').getTime();
const MMO_WEEK_MS = 15 * 60 * 1000;

const GameUI: React.FC = () => {
    const { gameState, dispatch } = useGame();
    const { activeTab, activeArtistId, artistsData, date } = gameState;
    const isMmoMode = !!(activeArtistId && artistsData[activeArtistId]?.userId);

    const [msUntilNextWeek, setMsUntilNextWeek] = useState<number>(0);

    // Global MMO Timer & Catch-up Logic
    useEffect(() => {
        if (!isMmoMode) return;

        let hasDispatched = false;
        let timeoutId: ReturnType<typeof setTimeout>;

        const checkTime = () => {
            const now = Date.now();
            
            // Calculate time left in current 15-minute block
            const msLeft = MMO_WEEK_MS - (now % MMO_WEEK_MS);
            setMsUntilNextWeek(msLeft);

            // Calculate global week (using a fixed epoch for week 1 so we can catch up)
            // Let's use June 29 2026 00:00:00 GMT as epoch just for week calculation
            const epoch = new Date('2026-06-29T00:00:00Z').getTime();
            const elapsedSinceEpoch = now - epoch;
            const globalWeekNumber = Math.max(1, Math.floor(elapsedSinceEpoch / MMO_WEEK_MS) + 1);

            // Convert local game date to local week number relative to 2026 (the MMO start year)
            const localWeekNumber = (date.year - 2026) * 52 + date.week;
            
            // Catch-up logic: If local game is behind global clock, progress week
            // Only dispatch once per effect run to avoid infinite loop crashes
            if (localWeekNumber < globalWeekNumber && !hasDispatched) {
                hasDispatched = true;
                dispatch({ type: 'PROGRESS_WEEK' });
                timeoutId = setTimeout(checkTime, 50);
            } else {
                timeoutId = setTimeout(checkTime, 1000);
            }
        };

        checkTime();

        return () => clearTimeout(timeoutId);
    }, [isMmoMode, date.week, date.year, dispatch]);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'Home':
                return <HomeTab />;
            case 'Apps':
                return <AppsTab />;
            case 'Charts':
                return <HomeTab />;
            case 'Business':
                return <BusinessTab />;
            case 'Misc':
                return <MiscTab />;
            default:
                return <HomeTab />;
        }
    };

    const handleProgressWeek = () => {
        dispatch({ type: 'PROGRESS_WEEK' });
    };

    return (
        <div className="h-full w-full flex flex-col bg-zinc-900 text-white relative">
            <main className="flex-grow overflow-y-auto pb-24 h-full">
                {renderActiveTab()}
            </main>
            {!isMmoMode ? (
                <button 
                  onClick={handleProgressWeek}
                  className="absolute z-20 bottom-24 right-4 bg-red-600 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-all transform hover:scale-105 shadow-red-600/30">
                  <span className="font-bold text-sm text-center leading-tight">Next Week</span>
                </button>
            ) : (
                <div className="absolute z-20 bottom-24 right-4 bg-zinc-800 border border-purple-500/50 text-white px-4 py-2 rounded-full shadow-lg flex items-center justify-center shadow-purple-500/30">
                  <span className="font-bold text-xs text-purple-400">Next week: {formatTime(msUntilNextWeek)}</span>
                </div>
            )}
            <BottomNav />
        </div>
    );
};


export default GameUI;

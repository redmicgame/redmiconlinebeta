import React, { useEffect, useState } from 'react';
import { useGame, formatNumber } from '../context/GameContext';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

const LeaderboardsView: React.FC = () => {
    const { dispatch } = useGame();
    const [artists, setArtists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        const fetchLeaderboard = async () => {
            const { subscribeToMmoArtists } = await import('../firebase');
            unsubscribe = subscribeToMmoArtists((data) => {
                setArtists(data);
                setLoading(false);
            });
        };
        fetchLeaderboard();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <div className="bg-[#121212] h-[100dvh] overflow-y-auto pb-32 text-white">
            <header className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'game' })} className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Global Leaderboard</h1>
                        <p className="text-sm text-zinc-400">Top real players in Red Mic</p>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4">
                {loading ? (
                    <div className="p-8 flex items-center justify-center text-zinc-400">Loading...</div>
                ) : (
                    <div className="bg-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-700/50 border border-zinc-700/50">
                        {artists.map((artist, i) => (
                            <div key={artist.id} className="flex items-center gap-4 p-4 hover:bg-zinc-700/50 transition-colors">
                                <div className="font-bold text-zinc-500 w-6 text-center">{i + 1}</div>
                                <img src={artist.image || 'https://ui-avatars.com/api/?name=' + artist.name} className="w-12 h-12 rounded-full object-cover bg-zinc-700" />
                                <div className="flex-grow min-w-0 flex flex-col justify-center">
                                    <h3 className="font-bold text-lg truncate flex items-center gap-2">
                                        {artist.name}
                                        {i < 3 && <span className="text-yellow-500 text-sm">★</span>}
                                        <span className="text-xs font-normal text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full">{artist.relationshipStatus || 'Single'}</span>
                                    </h3>
                                    <div className="text-sm text-zinc-400 flex flex-wrap gap-x-4">
                                        <span>💰 ${formatNumber(artist.money || 0)}</span>
                                        <span>👥 {formatNumber(artist.popularity || 0)} Pop</span>
                                    </div>
                                    {artist.biggestHit && (
                                        <div className="text-xs text-purple-400 mt-1 truncate">
                                            <span className="opacity-80 text-zinc-400">Biggest Hit:</span> {artist.biggestHit}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LeaderboardsView;

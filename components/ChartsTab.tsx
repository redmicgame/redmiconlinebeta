import React from 'react';
import { useGame } from '../context/GameContext';
import ChevronRightIcon from './icons/ChevronRightIcon';
import SpotifyIcon from './icons/SpotifyIcon';

const ChartItemPreview: React.FC<{
    rank: number;
    coverArt: string;
    title: string;
    artist: string;
}> = ({ rank, coverArt, title, artist }) => (
    <div className="flex items-center gap-4">
        <div className="text-2xl font-bold w-8 text-center text-zinc-400">{rank}</div>
        <img src={coverArt} alt={title} className="w-14 h-14 rounded-md object-cover"/>
        <div className="flex-grow min-w-0">
            <p className="font-bold truncate">{title}</p>
            <p className="text-sm text-zinc-400 truncate">{artist}</p>
        </div>
    </div>
);

const ChartsTab: React.FC = () => {
    const { gameState, dispatch } = useGame();
    const { billboardHot100, spotifyGlobal = [], billboardTopAlbums, hotPopSongs, hotRapRnb, electronicChart, countryChart, activeArtistId, artistsData } = gameState;
    const isMmoMode = !!(activeArtistId && artistsData[activeArtistId]?.userId);

    const [mmoSongs, setMmoSongs] = React.useState<any[]>([]);
    const [mmoAlbums, setMmoAlbums] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (!isMmoMode) return;
        const loadCharts = async () => {
            const { getMmoCharts } = await import('../firebase');
            const songs = await getMmoCharts('songs', 'lastWeekStreams', 3);
            setMmoSongs(songs);
            const albums = await getMmoCharts('albums', 'lastWeekStreams', 3);
            setMmoAlbums(albums);
        };
        loadCharts();
    }, [isMmoMode]);

    const getTop3Songs = (localChart: any[]) => {
        if (isMmoMode) {
            if (mmoSongs.length === 0) return [];
            return mmoSongs.map((s, i) => ({ rank: i + 1, coverArt: s.coverArt, title: s.title, artist: s.artistName, uniqueId: `mmo-song-${s.id}` }));
        }
        return localChart.slice(0, 3);
    };

    const getTop3Albums = (localChart: any[]) => {
        if (isMmoMode) {
            if (mmoAlbums.length === 0) return [];
            return mmoAlbums.map((a, i) => ({ rank: i + 1, coverArt: a.coverArt, title: a.title, artist: a.artistName, uniqueId: `mmo-album-${a.id}` }));
        }
        return localChart.slice(0, 3);
    };

    const billboardTop3 = getTop3Songs(billboardHot100);
    const spotifyTop3 = getTop3Songs(spotifyGlobal);
    const billboardAlbumsTop3 = getTop3Albums(billboardTopAlbums);
    const hotPopTop3 = getTop3Songs(hotPopSongs);
    const hotRapRnbTop3 = getTop3Songs(hotRapRnb);
    const electronicTop3 = getTop3Songs(electronicChart);
    const countryTop3 = getTop3Songs(countryChart);

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-3xl font-bold text-red-500">Charts</h2>
            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Billboard Hot 100</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'billboard' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {billboardTop3.length > 0 ? (
                    <div className="space-y-4">
                        {billboardTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-zinc-400">The chart is empty.</p>
                        <p className="text-zinc-500 text-sm">Release music and wait a week for the chart to update.</p>
                    </div>
                )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Billboard Top 50 Albums</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'billboardAlbums' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {billboardAlbumsTop3.length > 0 ? (
                    <div className="space-y-4">
                        {billboardAlbumsTop3.map(album => (
                            <ChartItemPreview key={album.uniqueId} rank={album.rank} coverArt={album.coverArt} title={album.title} artist={album.artist} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-zinc-400">The chart is empty.</p>
                        <p className="text-zinc-500 text-sm">Release an EP or Album and wait a week for the chart to update.</p>
                    </div>
                )}
            </div>
            
             <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <SpotifyIcon className="w-6 h-6"/>
                        <h3 className="font-bold text-lg">Spotify Charts</h3>
                    </div>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'spotifyChart' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {spotifyTop3.length > 0 ? (
                    <div className="space-y-4">
                        {spotifyTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-zinc-400">The chart is empty.</p>
                         <p className="text-zinc-500 text-sm">Release music and wait a week for the chart to update.</p>
                    </div>
                )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Hot Pop Songs</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'hotPopSongs' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {hotPopTop3.length > 0 ? (
                    <div className="space-y-4">
                        {hotPopTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : ( <div className="text-center py-6 text-zinc-400">Chart is empty.</div> )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Hot Rap/R&B Songs</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'hotRapRnb' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {hotRapRnbTop3.length > 0 ? (
                    <div className="space-y-4">
                        {hotRapRnbTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : ( <div className="text-center py-6 text-zinc-400">Chart is empty.</div> )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Electronic Chart</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'electronicChart' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {electronicTop3.length > 0 ? (
                    <div className="space-y-4">
                        {electronicTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : ( <div className="text-center py-6 text-zinc-400">Chart is empty.</div> )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Country Chart</h3>
                    <button onClick={() => dispatch({ type: 'CHANGE_VIEW', payload: 'countryChart' })} className="text-sm text-red-400 flex items-center gap-1">
                        View Chart <ChevronRightIcon className="w-4 h-4" />
                    </button>
                </div>
                {countryTop3.length > 0 ? (
                    <div className="space-y-4">
                        {countryTop3.map(song => (
                            <ChartItemPreview key={song.uniqueId} rank={song.rank} coverArt={song.coverArt} title={song.title} artist={song.artist} />
                        ))}
                    </div>
                ) : ( <div className="text-center py-6 text-zinc-400">Chart is empty.</div> )}
            </div>
        </div>
    );
};

export default ChartsTab;
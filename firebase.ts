import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, serverTimestamp, updateDoc, query, orderBy, limit, onSnapshot, addDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import type { GameState, XPost } from './types';

// Let's add the streaming function later down in the file.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const registerWithEmail = async (email: string, pass: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const loginWithEmail = async (email: string, pass: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        return result.user;
    } catch (error) {
        throw error;
    }
}

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
    }
};

export const loadGameFromCloud = async (userId: string): Promise<GameState | null> => {
    try {
        const querySnapshot = await getDocs(query(collection(db, 'users', userId, 'saves'), orderBy('updatedAt', 'desc'), limit(1)));
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data().gameState as GameState;
        }
        return await loadLegacyGameFromCloud(userId);
    } catch (error) {
        console.error("Error loading game from cloud:", error);
        return null;
    }
};

export const getUserSaves = async (userId: string) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'users', userId, 'saves'));
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching user saves:", error);
        return [];
    }
};

export const deleteCloudSave = async (userId: string, saveId: string) => {
    try {
        await deleteDoc(doc(db, 'users', userId, 'saves', saveId));
    } catch (error) {
        console.error("Error deleting cloud save:", error);
        throw error;
    }
};

export const saveGameToCloud = async (userId: string, saveId: string, gameState: GameState) => {
    try {
        const saveRef = doc(db, 'users', userId, 'saves', saveId);
        let artistName = "Unknown";
        if (gameState.careerMode === 'solo' && gameState.soloArtist) {
            artistName = gameState.soloArtist.name;
        } else if (gameState.careerMode === 'group' && gameState.group) {
            artistName = gameState.group.name;
        }

        // Firebase Firestore does not support 'undefined' values. 
        // We stringify and parse to seamlessly strip all 'undefined' properties.
        const cleanGameState = JSON.parse(JSON.stringify(gameState));

        await setDoc(saveRef, {
            userId,
            saveId,
            gameState: cleanGameState,
            artistName,
            year: gameState.date.year,
            week: gameState.date.week,
            updatedAt: serverTimestamp()
        });
        return saveId;
    } catch (error) {
        console.error("Error saving game to cloud:", error);
        throw error;
    }
};

// Also keep a legacy loader in case they have an old /saves/userId doc they try to load later
export const loadLegacyGameFromCloud = async (userId: string): Promise<GameState | null> => {
    try {
        const _doc = await getDoc(doc(db, 'saves', userId));
        if (_doc.exists()) {
            return _doc.data().gameState as GameState;
        }
        return null;
    } catch (error) {
        console.error("Error loading legacy game from cloud:", error);
        return null;
    }
};

export const loadMmoArtistProfile = async (userId: string) => {
    try {
        // Fetch the user's artist ID
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return null;
        
        const artistId = userDoc.data().artistId;
        if (!artistId) return null;

        // Fetch the artist document
        const artistDoc = await getDoc(doc(db, 'artists', artistId));
        if (!artistDoc.exists()) return null;

        return { id: artistDoc.id, ...artistDoc.data() };
    } catch (error) {
        console.error("Error loading MMO artist profile:", error);
        return null;
    }
}

export const createMmoArtistProfile = async (userId: string, data: any) => {
    try {
        if (!data.name) throw new Error("Name is required");
        const artistName = data.name.trim();
        const claimedNameId = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check if name is already claimed
        const claimedNameRef = doc(db, 'claimedNames', claimedNameId);
        const nameDoc = await getDoc(claimedNameRef);
        
        if (nameDoc.exists()) {
            throw new Error(`The name "${artistName}" is already claimed.`);
        }

        const artistId = `artist_${crypto.randomUUID().replace(/-/g, '')}`;
        
        const artistData = {
            userId,
            name: artistName,
            fandomName: data.fandomName,
            image: data.image,
            money: 100000,
            popularity: 0,
            hype: 0,

            // Solo specific
            age: data.age || 18,
            country: data.country || 'US',
            pronouns: data.pronouns || 'they/them',

            // Shared metadata
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const batch = writeBatch(db);

        // Claim the name
        batch.set(claimedNameRef, {
            userId,
            artistId,
            name: artistName,
            createdAt: Date.now()
        });

        // Write to artists collection
        batch.set(doc(db, 'artists', artistId), artistData);

        // Update User object to link the artistId
        batch.set(doc(db, 'users', userId), {
            email: auth.currentUser?.email || '',
            artistId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }, { merge: true });

        await batch.commit();

        return { id: artistId, ...artistData };
    } catch (error) {
        console.error("Error creating MMO artist:", error);
        throw error;
    }
}

export const postMmoTweet = async (authorId: string, authorName: string, authorUsername: string, authorAvatar: string, content: string, image?: string, quoteData?: any) => {
    try {
        const payload: any = {
            authorId,
            authorName,
            authorUsername,
            authorAvatar,
            content,
            image: image || null,
            likes: 0,
            retweets: 0,
            createdAt: Date.now()
        };
        if (quoteData) {
            payload.quoteData = JSON.stringify(quoteData);
        }
        const docRef = await addDoc(collection(db, 'tweets'), payload);
        return docRef.id;
    } catch (error) {
        console.error("Error posting MMO tweet:", error);
        throw error;
    }
}

export const subscribeToMmoTweets = (callback: (tweets: any[]) => void) => {
    const q = query(collection(db, 'tweets'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        const tweets = snapshot.docs.map(doc => {
            const data = doc.data();
            let quoteOf = undefined;
            if (data.quoteData) {
                try { quoteOf = JSON.parse(data.quoteData); } catch(e){}
            }
            return { id: doc.id, ...data, quoteOf };
        });
        callback(tweets);
    });
}

export const syncMmoArtist = async (artistId: string, data: any) => {
    try {
        const artistRef = doc(db, 'artists', artistId);
        await updateDoc(artistRef, {
            money: data.money,
            popularity: data.popularity,
            monthlyListeners: data.monthlyListeners || 0,
            relationshipStatus: data.relationshipStatus || 'Single',
            biggestHit: data.biggestHit || null,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error("Error syncing MMO artist:", error);
    }
}

export const syncMmoSongs = async (songs: any[]) => {
    try {
        const batch = writeBatch(db);
        for (const song of songs) {
            if (!song.title || !song.artistId || !song.artistName) continue;
            const songRef = doc(db, 'songs', song.id);
            batch.set(songRef, {
                title: song.title,
                artistId: song.artistId,
                artistName: song.artistName,
                coverArt: song.coverArt || '',
                streams: song.streams || 0,
                lastWeekStreams: song.lastWeekStreams || 0,
                sales: song.sales || 0,
                updatedAt: Date.now()
            }, { merge: true });
        }
        await batch.commit();
    } catch (error) {
        console.error("Error syncing MMO songs:", error);
    }
}

export const syncMmoAlbums = async (albums: any[]) => {
    try {
        const batch = writeBatch(db);
        for (const album of albums) {
            if (!album.title || !album.artistId || !album.artistName) continue;
            const albumRef = doc(db, 'albums', album.id);
            batch.set(albumRef, {
                title: album.title,
                artistId: album.artistId,
                artistName: album.artistName,
                coverArt: album.coverArt || '',
                streams: album.streams || 0,
                lastWeekStreams: album.lastWeekStreams || 0,
                sales: album.sales || 0,
                updatedAt: Date.now()
            }, { merge: true });
        }
        await batch.commit();
    } catch (error) {
        console.error("Error syncing MMO albums:", error);
    }
}

export const fetchMmoArtists = async () => {
    try {
        const q = query(collection(db, 'artists'), orderBy('popularity', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching MMO artists:", error);
        return [];
    }
}

export const sendMmoRequest = async (senderId: string, senderName: string, receiverId: string, type: string, metadata: any) => {
    try {
        const payload = {
            senderId,
            senderName,
            receiverId,
            type,
            status: 'PENDING',
            metadata,
            createdAt: Date.now()
        };
        const docRef = await addDoc(collection(db, 'requests'), payload);
        return docRef.id;
    } catch (error) {
        console.error("Error sending MMO request:", error);
        throw error;
    }
}

export const subscribeToMmoRequests = (userId: string, callback: (requests: any[]) => void) => {
    // Queries requests where current user is receiver
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(100)); // We'll filter client side for simplicty since composite limits require an index
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((req: any) => req.receiverId === userId);
        callback(requests);
    });
}

export const subscribeToSentMmoRequests = (userId: string, callback: (requests: any[]) => void) => {
    // Queries requests where current user is sender
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((req: any) => req.senderId === userId);
        callback(requests);
    });
}

export const updateMmoRequestStatus = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
        const reqRef = doc(db, 'requests', requestId);
        await updateDoc(reqRef, {
            status,
            updatedAt: Date.now()
        });
    } catch (error) {
        console.error("Error updating MMO request status:", error);
        throw error;
    }
}

export const subscribeToMmoCharts = (collectionName: 'songs' | 'albums', sortBy: 'streams' | 'lastWeekStreams', limitCount: number, callback: (items: any[]) => void) => {
    const q = query(collection(db, collectionName), orderBy(sortBy, 'desc'), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    });
}

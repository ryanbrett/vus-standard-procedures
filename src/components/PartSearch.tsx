// src/components/PartSearch.tsx

import { useState, useEffect } from 'react';
import { auth, db, analytics } from '../firebase';
// Split imports: values vs types
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth'; // Type-only import

import { collection, query, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'; // Type-only imports

import { logEvent } from 'firebase/analytics';

// Mapping from dropdown selection to Firestore collection names
const COLLECTION_MAP: { [key: string]: string } = {
    aluminum_sign: 'signs', acm_sign: 'signs', hdpe_sign: 'signs', corrugated: 'signs',
    magnet: 'decals', opus_cut_decal: 'decals', digital_print: 'decals', banner: 'decals', screenDecal: 'decals',
    delta: 'deltas', bullet: 'bullets', drv: 'drvs'
};

const PAGE_SIZE = 100;

export default function PartSearch() {
    // --- STATE ---
    const [user, setUser] = useState<User | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [searchName, setSearchName] = useState('');
    const [searchType, setSearchType] = useState('');
    const [results, setResults] = useState<DocumentData[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [hasMore, setHasMore] = useState(false);

    // --- EFFECTS ---
    // Monitor authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // --- ACTIONS ---
    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            logEvent(analytics, 'login', { method: 'email' });
        } catch (err: any) {
            console.error("Sign-in error:", err);
            setAuthError('Failed to sign in. Check your email and password.');
        }
    };

    const handleSearch = async (loadMore = false) => {
        if (!user) return;
        if (!searchType) {
             setSearchError('Please select a part type.');
             return;
        }

        setLoading(true);
        setSearchError('');
        if (!loadMore) setResults([]);

        const collectionName = COLLECTION_MAP[searchType];
        if (!collectionName) {
             setSearchError('No data available for this part type.');
             setLoading(false);
             return;
        }

        try {
            // Replicating original path: artifacts/{appId}/public/data/{collectionName}
            const appId = import.meta.env.VITE_FIREBASE_APP_ID;
            const collectionPath = `artifacts/${appId}/public/data/${collectionName}`;
            
            let q = query(collection(db, collectionPath), orderBy('Name'), limit(PAGE_SIZE));
            if (loadMore && lastDoc) {
                q = query(collection(db, collectionPath), orderBy('Name'), startAfter(lastDoc), limit(PAGE_SIZE));
            }

            const snapshot = await getDocs(q);
            const newResults: DocumentData[] = [];
            
            // Client-side filtering to match original behavior
            const lowerSearchName = searchName.toLowerCase();
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!searchName || data.Name?.toLowerCase().includes(lowerSearchName)) {
                    newResults.push(data);
                }
            });

            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setResults(prev => loadMore ? [...prev, ...newResults] : newResults);
            setHasMore(snapshot.size === PAGE_SIZE);
            
            if (!loadMore) {
                 logEvent(analytics, 'search', { part_type: searchType, search_term: searchName });
            }

        } catch (err: any) {
            console.error("Search error:", err);
            setSearchError(err.message || 'Error occurred during search.');
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    if (!user) {
        return (
            <div className="p-5 max-w-md mx-auto border rounded mt-10">
                <h2 className="text-xl font-bold mb-4">Sign In to Search Parts</h2>
                <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                        <label className="block font-semibold mb-1">Email:</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded bg-gray-700" required />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Password:</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded bg-gray-700" required />
                    </div>
                    {authError && <p className="text-red-600">{authError}</p>}
                    <button type="submit" className="cursor-pointer w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Sign In</button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-5 max-w-4xl mx-auto mt-8 border-t">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Part Search</h2>
                <div className="text-sm text-gray-600">Signed in as: {user.email}</div>
            </div>

            <div className="flex gap-4 mb-6 items-end">
                 <div className="flex-1">
                    <label className="block font-semibold mb-1">Part Type:</label>
                     <select value={searchType} onChange={e => setSearchType(e.target.value)} className="w-full p-2 border rounded bg-gray-700 text-white">
                        <option value="">-- Select Part Type --</option>
                        {Object.keys(COLLECTION_MAP).map(key => (
                            <option key={key} value={key}>{key.replace(/_/g, ' ').toUpperCase()}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-[2]">
                    <label className="block font-semibold mb-1">Part Name (Optional):</label>
                    <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Enter part name to filter" className="w-full p-2 border rounded  bg-gray-700" />
                </div>
                <button onClick={() => handleSearch(false)} disabled={loading} className="bg-blue-600 cursor-pointer text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 h-10">
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {searchError && <p className="text-red-600 mb-4 font-bold">{searchError}</p>}

            <div className="space-y-4">
                {results.map((part, index) => (
                    <div key={index} className="p-4 text-left border rounded shadow-sm text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <p><strong>Part No:</strong> {part['Part No'] || 'N/A'}</p>
                            <p><strong>Rev:</strong> {part.Rev || 'N/A'}</p>
                            <p className="col-span-2"><strong>Name:</strong> {part.Name || 'N/A'}</p>
                            <p><strong>Old Part No:</strong> {part['Old Part No'] || 'N/A'}</p>
                            <p><strong>Type:</strong> {part['Part Type'] || 'N/A'}</p>
                            <p><strong>Status:</strong> {part['Part Status'] || 'N/A'}</p>
                            <p className="col-span-2"><strong>Note:</strong> {part.Note || 'N/A'}</p>
                        </div>
                    </div>
                ))}
                {results.length === 0 && !loading && !searchError && <p className="text-gray-500 text-center">No results found.</p>}
            </div>

            {hasMore && (
                 <button onClick={() => handleSearch(true)} disabled={loading} className="mt-6 cursor-pointer w-full bg-blue-600 py-2 rounded hover:bg-blue-700">
                    Load More
                </button>
            )}
        </div>
    );
}
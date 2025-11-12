// src/components/PartSearch.tsx

import { useState, useEffect } from 'react';
import { auth, db, analytics } from '../firebase';
// Split imports: values vs types
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth'; // Type-only import

import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  where 
} from 'firebase/firestore';
import type { 
  DocumentData, 
  QueryDocumentSnapshot, 
  QueryConstraint,
  WhereFilterOp // Import the type for 'op'
} from 'firebase/firestore'; // Type-only imports

import { logEvent } from 'firebase/analytics';

// --- NEW CONFIGURATION INTERFACE ---
// This defines the shape of our new filter rules
interface SearchConfig {
  // Server-Side Filters (run on database)
  serverFilters: {
    field: string;
    op: WhereFilterOp; // Use the official Firestore type (e.g., '==', '>=', '<=')
    value: string;
  }[];
  
  // Client-Side Filters (run in browser)
  clientFilterField?: string;
  clientFilterValues?: string[]; // e.g., ['opus', 'pmps']
}

// --- NEW SEARCH CONFIG MAP ---
// This map *only* defines filters. The collection is ALWAYS 'parts'.
// Make sure the 'field' and 'value' strings (e.g., "PartGroup", "Signs")
// EXACTLY match the case and spelling in your new database.
const SEARCH_CONFIG_MAP: { [key: string]: SearchConfig } = {
  // --- Signs ---
  hdpe_sign: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Grade", op: "==", value: "HDPE" }
    ]
  },
  acm_sign: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      // Prefix filter for "3mm" on the 'Name' field
      { field: "Name", op: ">=", value: "3mm" },
      { field: "Name", op: "<=", value: "3mm\uf8ff" }
    ]
  },
  aluminum_sign: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" }
      // You can add more filters here, e.g., { field: "PartType", op: "==", value: "Small Signs" }
    ]
  },
  corrugated: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Part Type", op: "==", value: "Temporary Markings" }
    ]
  },

  // --- Decals ---
  magnet: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Part Type", op: "==", value: "Decal/Media" }
    ],
    clientFilterField: "Name",
    clientFilterValues: ["magnet"]
  },
  opus_cut_decal: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Part Type", op: "==", value: "Decal/Media" }
    ],
    clientFilterField: "Name",
    clientFilterValues: ["opus", "pmps"]
  },
  banner: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Part Type", op: "==", value: "Decal/Media" }
    ],
    clientFilterField: "Name",
    clientFilterValues: ["banner"]
  },
  digital_print: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Signs" },
      { field: "Part Type", op: "==", value: "Decal/Media" }
    ]
  },
  screenDecal: {
    serverFilters: [
      { field: "Part Group", op: "==", value: "Decals" },
      { field: "Part Type", op: "==", value: "Screen Decal" }
    ]
  },

  // --- Other Groups ---
  delta: {
    serverFilters: [ { field: "Part Group", op: "==", value: "Deltas" } ]
  },
  bullet: {
    serverFilters: [ { field: "Part Group", op: "==", value: "Bullets" } ]
  },
  drv: {
    serverFilters: [ { field: "Part Group", op: "==", value: "DRVs" } ]
  }
};

const PAGE_SIZE = 100;

export default function PartSearch() {
  // --- STATE (All Unchanged) ---
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

  // --- EFFECTS (All Unchanged) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- ACTIONS (handleSignIn Unchanged) ---
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

  // --- UPDATED handleSearch FUNCTION ---
  const handleSearch = async (loadMore = false) => {
    if (!user) return;
    if (!searchType) {
      setSearchError('Please select a part type.');
      return;
    }

    setLoading(true);
    setSearchError('');
    if (!loadMore) setResults([]);

    // 1. Get the filter config from the map
    const config = SEARCH_CONFIG_MAP[searchType];
    if (!config) {
      setSearchError('No data available for this part type.');
      setLoading(false);
      return;
    }

    try {
      // --- THE COLLECTION PATH IS NOW STATIC ---
      // We removed the [APP_ID] and complex path.
      // This is simpler and more robust.
      const collectionPath = "parts";
      
      // --- 2. BUILD SERVER-SIDE QUERY ---
      const constraints: QueryConstraint[] = [];
      
      // Add all server filters from our config
      config.serverFilters.forEach(filter => {
        constraints.push(where(filter.field, filter.op, filter.value));
      });

      // Add the correct 'orderBy'
      // If we are doing a prefix search (e.g., on 'Name'), we MUST order by 'Name'.
      // Otherwise, we can default to ordering by 'Name'.
      const prefixFilter = config.serverFilters.find(f => f.op === '>=');
      if (prefixFilter) {
        // If we have a range filter (>=), we must order by that same field.
        constraints.push(orderBy(prefixFilter.field));
      } else {
        // Default sort for all other queries
        constraints.push(orderBy('Name'));
      }

      // --- 3. ADD PAGINATION & LIMIT ---
      constraints.push(limit(PAGE_SIZE));
      if (loadMore && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      // --- 4. EXECUTE SERVER QUERY ---
      const q = query(collection(db, collectionPath), ...constraints);
      const snapshot = await getDocs(q);

      // --- 5. CLIENT-SIDE FILTERING (Unchanged from before) ---
      const newResults: DocumentData[] = [];
      const lowerSearchName = searchName.toLowerCase();
      const clientKeywords = config.clientFilterValues?.map(k => k.toLowerCase());
      const clientField = config.clientFilterField;

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Condition 1: Check free-text input box
        const matchesSearchName = !searchName || 
                                  data.Name?.toLowerCase().includes(lowerSearchName);

        // Condition 2: Check dropdown "contains" filter
        let matchesDropdownKeywords = true; // Default to true
        if (clientKeywords && clientField && data[clientField]) {
          const dataToSearch = (data[clientField] as string).toLowerCase();
          matchesDropdownKeywords = clientKeywords.some(keyword => dataToSearch.includes(keyword));
        }
        
        // Add to results only if both conditions pass
        if (matchesSearchName && matchesDropdownKeywords) {
          newResults.push(data);
        }
      });
      
      // --- 6. UPDATE STATE (Unchanged) ---
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setResults(prev => loadMore ? [...prev, ...newResults] : newResults);
      setHasMore(snapshot.size === PAGE_SIZE);
      
      if (!loadMore) {
        logEvent(analytics, 'search', { part_type: searchType, search_term: searchName });
      }

    } catch (err: any) {
      console.error("Search error:", err);
      // This is now MORE IMPORTANT THAN EVER!
      if (err.code === 'failed-precondition') {
           setSearchError("A database index is required for this query. Check the browser console for a link to create it.");
           console.warn("INDEXING REQUIRED: Firestore error:", err.message);
      } else {
           setSearchError(err.message || 'Error occurred during search.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // --- RENDER (All Unchanged) ---
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
            {/* Make sure to use the new map here */}
            <select value={searchType} onChange={e => setSearchType(e.target.value)} className="w-full p-2 border rounded bg-gray-700 text-white">
              <option value="">-- Select Part Type --</option>
              {/* This will now list all the keys from the new map */}
              {Object.keys(SEARCH_CONFIG_MAP).map(key => (
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
            {/* The render output is unchanged, but you should verify these fields
                (e.g., 'Part No', 'Rev', 'Name') match your database case */}
            <div className="grid grid-cols-2 gap-2">
              <p><strong>Part No:</strong> {part['Part No'] || 'N/A'}</p>
              <p><strong>Rev:</strong> {part.Rev || 'N/A'}</p>
              <p className="col-span-2"><strong>Name:</strong> {part.Name || 'N/A'}</p>
              <p><strong>Old Part No:</strong> {part['Old Part No'] || 'N/A'}</p>
              <p><strong>Part Type:</strong> {part['Part Type'] || 'N/A'}</p>
              <p><strong>Part Group:</strong> {part['Part Group'] || 'N/A'}</p>              
              <p><strong>Part Status:</strong> {part['Part Status'] || 'N/A'}</p>
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
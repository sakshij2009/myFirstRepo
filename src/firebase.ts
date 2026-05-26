import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M',
  authDomain: 'famforeveradmin.firebaseapp.com',
  projectId: 'famforeveradmin',
  storageBucket: 'famforeveradmin.appspot.com',
  messagingSenderId: '849373739430',
  appId: '1:849373739430:web:5e3d88fbb3200dc3a43767',
};

const app = initializeApp(firebaseConfig);

// persistentLocalCache stores all Firestore data in IndexedDB on the device.
// On next load the data is served from disk in <10ms instead of waiting for the network.
// The live onSnapshot listener then streams any changes from Firestore on top.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

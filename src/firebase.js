import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyChAeNwRkUF6DfUnnI1xKl_XRoSjv82WZU",
  authDomain: "apartmens-saas.firebaseapp.com",
  projectId: "apartmens-saas",
  storageBucket: "apartmens-saas.firebasestorage.app",
  messagingSenderId: "543830218393",
  appId: "1:543830218393:web:2d01ea273c6d6807270a08"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

export default app
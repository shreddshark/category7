import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyBOX924Jg2_4yWmLJ3nQYaGMLl6JFFHMVg",
  authDomain: "category7-52f07.firebaseapp.com",
  projectId: "category7-52f07",
  storageBucket: "category7-52f07.firebasestorage.app",
  messagingSenderId: "421569012781",
  appId: "1:421569012781:web:a52cf6049f48684ca204a4",
}

const app = initializeApp(firebaseConfig)

const db = getFirestore(app)
const auth = getAuth(app)

export { app, db, auth }

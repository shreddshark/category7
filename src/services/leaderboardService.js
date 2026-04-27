import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore"
import { db } from "@/firebase"

function isBetterScore(newEntry, existingEntry) {
  if (newEntry.score > existingEntry.score) return true
  if (newEntry.score < existingEntry.score) return false

  const newDuration = newEntry.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER
  const oldDuration =
    existingEntry.durationUsedSeconds ?? Number.MAX_SAFE_INTEGER

  return newDuration < oldDuration
}

export async function saveLeaderboardEntry(entry) {
  const leaderboardRef = collection(db, "leaderboard")

  const existingScoreQuery = query(
    leaderboardRef,
    where("uid", "==", entry.uid),
    where("questionCount", "==", entry.questionCount),
    where("timeLimit", "==", entry.timeLimit),
  )

  const snapshot = await getDocs(existingScoreQuery)

  const cleanedEntry = {
    uid: entry.uid,
    name: entry.name || "Anonymous",
    score: Number(entry.score) || 0,
    questionCount: Number(entry.questionCount),
    timeLimit: Number(entry.timeLimit),
    timeLimitLabel: entry.timeLimitLabel,
    durationUsedSeconds: entry.durationUsedSeconds ?? null,
    date: new Date().toLocaleDateString(),
    updatedAt: serverTimestamp(),
  }

  if (snapshot.empty) {
    await addDoc(leaderboardRef, {
      ...cleanedEntry,
      attempts: 1,
      createdAt: serverTimestamp(),
    })

    return
  }

  const existingDoc = snapshot.docs[0]
  const existingData = existingDoc.data()

  const shouldUpdateScore = isBetterScore(cleanedEntry, existingData)

  await updateDoc(doc(db, "leaderboard", existingDoc.id), {
    ...(shouldUpdateScore ? cleanedEntry : {}),
    attempts: (existingData.attempts || 1) + 1,
    lastAttemptAt: serverTimestamp(),
  })
}

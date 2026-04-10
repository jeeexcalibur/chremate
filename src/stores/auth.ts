import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const firebaseUser = ref<FirebaseUser | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function fetchUserProfile(fbUser: FirebaseUser): Promise<User> {
    const userDoc = await getDoc(doc(db, 'users', fbUser.uid))
    if (userDoc.exists()) {
      return userDoc.data() as User
    }
    // Create default profile
    const newUser: User = {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      monthlyBudget: 5000000, // 5 million IDR default
      currency: 'IDR',
    }
    await setDoc(doc(db, 'users', fbUser.uid), newUser)
    return newUser
  }

  function init() {
    if (!auth) {
      loading.value = false
      return
    }
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        firebaseUser.value = fbUser
        try {
          user.value = await fetchUserProfile(fbUser)
        } catch (e) {
          console.error('Failed to fetch user profile:', e)
          // Still set basic user info
          user.value = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            monthlyBudget: 5000000,
            currency: 'IDR',
          }
        }
      } else {
        user.value = null
        firebaseUser.value = null
      }
      loading.value = false
    })
  }

  async function loginWithEmail(email: string, password: string) {
    error.value = null
    loading.value = true
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      error.value = getErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function registerWithEmail(name: string, email: string, password: string) {
    error.value = null
    loading.value = true
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName: name })
    } catch (e: any) {
      error.value = getErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function loginWithGoogle() {
    error.value = null
    loading.value = true
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      error.value = getErrorMessage(e.code)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await signOut(auth)
    user.value = null
  }

  async function updateBudget(budget: number) {
    if (!user.value) return
    user.value.monthlyBudget = budget
    await setDoc(doc(db, 'users', user.value.uid), user.value, { merge: true })
  }

  function getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.'
      case 'auth/wrong-password': return 'Incorrect password.'
      case 'auth/email-already-in-use': return 'This email is already registered.'
      case 'auth/weak-password': return 'Password should be at least 6 characters.'
      case 'auth/invalid-email': return 'Please enter a valid email address.'
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.'
      case 'auth/popup-closed-by-user': return 'Sign-in was cancelled.'
      default: return 'An error occurred. Please try again.'
    }
  }

  return {
    user,
    firebaseUser,
    loading,
    error,
    isAuthenticated,
    init,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
    updateBudget,
  }
})

import { User, updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, getFCMToken } from '../firebase';
import { UserData } from '../types/chat';

export const initializeUserData = async (user: User): Promise<void> => {
  try {
    const fcmToken = await getFCMToken();
    const userRef = doc(db, 'users', user.uid);
    
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      fcmToken,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      blockedUsers: [],
      mutedChannels: [],
      mutedDMs: [],
      status: null
    }, { merge: true });
  } catch (error) {
    console.error('Error initializing user data:', error);
  }
};

export const handleProfileUpdate = async (
  user: User,
  displayName: string,
  profilePicture: File | null,
  setUsersCache: (callback: (prev: Record<string, UserData>) => Record<string, UserData>) => void
): Promise<void> => {
  let photoURL = user.photoURL;

  // Upload new profile picture if selected
  if (profilePicture) {
    const storageRef = ref(storage, `profile_pictures/${user.uid}`);
    const uploadResult = await uploadBytes(storageRef, profilePicture);
    photoURL = await getDownloadURL(uploadResult.ref);
  }

  // Update Auth profile
  await updateProfile(user, {
    displayName: displayName.trim() || null,
    photoURL
  });

  // Update or create user document in Firestore
  const userRef = doc(db, 'users', user.uid);
  const userData = {
    email: user.email,
    displayName: displayName.trim() || null,
    photoURL,
    updatedAt: serverTimestamp()
  };
  await setDoc(userRef, userData, { merge: true });

  // Update local cache immediately
  setUsersCache(prev => ({
    ...prev,
    [user.uid]: {
      ...prev[user.uid],
      email: user.email ?? '',
      displayName: displayName.trim() || null,
      photoURL
    }
  }));

  // Update all messages from this user
  const messagesRef = collection(db, 'messages');
  const userMessagesQuery = query(
    messagesRef,
    where('sender.uid', '==', user.uid)
  );

  const snapshot = await getDocs(userMessagesQuery);
  const batch = writeBatch(db);

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      'sender.displayName': displayName.trim() || null,
      'sender.photoURL': photoURL
    });
  });

  await batch.commit();
};

export const handleEmailUpdate = async (user: User, newEmail: string, currentPassword: string): Promise<void> => {
  // Re-authenticate user
  const credential = EmailAuthProvider.credential(
    user.email!,
    currentPassword
  );
  await reauthenticateWithCredential(user, credential);
  
  // Update email
  await updateEmail(user, newEmail);
};

export const handlePasswordUpdate = async (user: User, newPassword: string, currentPassword: string): Promise<void> => {
  // Re-authenticate user
  const credential = EmailAuthProvider.credential(
    user.email!,
    currentPassword
  );
  await reauthenticateWithCredential(user, credential);
  
  // Update password
  await updatePassword(user, newPassword);
};

export const handleResendVerification = async (user: User): Promise<void> => {
  await sendEmailVerification(user);
}; 
import { db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  query,
  limit,
  DocumentData,
} from 'firebase/firestore';

const BATCH_SIZE = 500;

async function migrateMessages() {
  console.log('Starting message migration...');
  const messagesRef = collection(db, 'messages');
  const messageSnapshots = await getDocs(messagesRef);
  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const messageDoc of messageSnapshots.docs) {
    const data = messageDoc.data();
    const updates: DocumentData = {};

    // Convert sender to senderUid
    if (data.sender && !data.senderUid) {
      updates.senderUid = data.sender.uid;
      updates._sender = data.sender;  // Keep for backward compatibility
    }

    // Update reply structure if it exists
    if (data.replyTo && data.replyTo.sender) {
      updates['replyTo.senderUid'] = data.replyTo.sender.uid;
      delete data.replyTo.sender;
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'messages', messageDoc.id), updates);
      count++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
        console.log(`Processed ${count} messages...`);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Completed message migration. Updated ${count} messages.`);
}

async function migrateWorkspaces() {
  console.log('Starting workspace migration...');
  const workspacesRef = collection(db, 'workspaces');
  const workspaceSnapshots = await getDocs(workspacesRef);
  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const workspaceDoc of workspaceSnapshots.docs) {
    const data = workspaceDoc.data();
    const updates: DocumentData = {};

    // Convert invitedEmails to pendingInvites if it exists
    if (data.invitedEmails && !data.pendingInvites) {
      const pendingInvites = data.invitedEmails.map((email: string) => ({
        email: email.toLowerCase(),
        invitedBy: data.createdBy,
        timestamp: new Date(),
      }));
      updates.pendingInvites = pendingInvites;
      updates.invitedEmails = null;  // Mark for deletion
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'workspaces', workspaceDoc.id), updates);
      count++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
        console.log(`Processed ${count} workspaces...`);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Completed workspace migration. Updated ${count} workspaces.`);
}

async function migrateChannels() {
  console.log('Starting channel migration...');
  const channelsRef = collection(db, 'channels');
  const channelSnapshots = await getDocs(channelsRef);
  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const channelDoc of channelSnapshots.docs) {
    const data = channelDoc.data();
    const updates: DocumentData = {};

    // Ensure dm array contains only UIDs
    if (data.dm && Array.isArray(data.dm)) {
      const cleanDm = data.dm.filter((id: any) => typeof id === 'string' && id.length > 0);
      if (cleanDm.length !== data.dm.length) {
        updates.dm = cleanDm;
      }
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, 'channels', channelDoc.id), updates);
      count++;
      batchCount++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
        console.log(`Processed ${count} channels...`);
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`Completed channel migration. Updated ${count} channels.`);
}

export async function runMigration() {
  try {
    console.log('Starting data migration to UIDs...');
    await migrateMessages();
    await migrateWorkspaces();
    await migrateChannels();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
} 
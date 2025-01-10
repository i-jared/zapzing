/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");

admin.initializeApp();

// Basic regex to validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.sendNotificationOnMessageCreate = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data found");
        return null;
      }
      const messageData = snapshot.data();
      if (!messageData) {
        console.log("No message data found");
        return null;
      }

      console.log("messageData", messageData);

      // Extract relevant fields from the newly created message
      const channelId = messageData.channel;
      const senderUid = messageData.senderUid;
      const messageText = messageData.text;

      // Get the channel document to retrieve the workspaceId
      const channelDoc = await getFirestore()
        .collection("channels")
        .doc(channelId)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${channelId} does not exist`);
        return null;
      }

      const channelData = channelDoc.data();
      const tokens = [];
      const workspaceId = channelData.workspaceId;

      // Get sender's data for notification
      const senderDoc = await getFirestore()
        .collection("users")
        .doc(senderUid)
        .get();
      
      if (!senderDoc.exists) {
        console.log(`Sender ${senderUid} not found`);
        return null;
      }

      const senderData = senderDoc.data();

      if (channelData.dm) {
        console.log("DM channel");
        // For DM channels, find the other user's UID
        const recipientUid = channelData.dm.find(uid => uid !== senderUid);

        if (recipientUid) {
          const userDoc = await getFirestore()
            .collection("users")
            .doc(recipientUid)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const { fcmToken, blockedUsers = [], mutedDMs = [] } = userData;

            if (fcmToken && !blockedUsers.includes(senderUid) && !mutedDMs.includes(channelId)) {
              tokens.push(fcmToken);
            }
          }
        }
      } else {
        // For regular channels
        const workspaceDoc = await getFirestore()
          .collection("workspaces")
          .doc(workspaceId)
          .get();

        if (!workspaceDoc.exists) {
          console.log(`Workspace ${workspaceId} does not exist`);
          return null;
        }

        const workspaceData = workspaceDoc.data();
        const memberUids = workspaceData.members.filter(uid => uid !== senderUid);

        console.log("members", memberUids);

        if (memberUids.length > 0) {
          // Query all users in that workspace
          const usersSnapshot = await getFirestore()
            .collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", memberUids)
            .get();

          usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const { blockedUsers = [], mutedChannels = [], fcmToken } = userData;

            // Skip if user has blocked the sender or muted the channel
            if (blockedUsers.includes(senderUid) || mutedChannels.includes(channelId)) {
              return;
            }

            // Collect the token if it exists
            if (fcmToken) {
              tokens.push(fcmToken);
            }
          });
        }
      }

      if (tokens.length === 0) {
        console.log("No valid FCM tokens to send to.");
        return null;
      }

      // Build the notification payload
      const message = {
        tokens,
        notification: {
          title: senderData.displayName || "New Message",
          body: messageText,
        },
        webpush: {
          fcm_options: {
            link: "https://zappzingg.web.app",
          },
        },
        data: {
          channelId,
          senderUid,
          workspaceId,
        },
      };

      // Send notifications to all collected tokens via FCM
      const response = await getMessaging().sendEachForMulticast(message);
      console.log("FCM response:", response);

      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  }
);

/**
 * Firestore Trigger: onInvitedEmailsUpdate
 * Triggered when a document in 'workspaces/{uid}' is updated.
 * Looks for newly added emails in `invitedEmails` array.
 */
exports.onInvitedEmailsUpdate7 = onDocumentUpdated(
  "workspaces/{uid}",
  async (event) => {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const beforeData = event.data.before.data() || {};
      const afterData = event.data.after.data() || {};

      const beforeInvites = beforeData.invitedEmails || [];
      const afterInvites = afterData.invitedEmails || [];

      // Find any newly added emails (present in afterInvites but not in beforeInvites)
      const newlyAddedEmails = afterInvites.filter(
        (email) => !beforeInvites.includes(email)
      );

      if (!newlyAddedEmails.length) {
        console.log("No new invites added.");
        return null;
      }

      const workspaceUid = event.params.uid; // The doc ID in 'workspaces/{uid}'
      console.log(
        `Newly invited emails for workspace UID [${workspaceUid}]:`,
        newlyAddedEmails
      );

      // Send an invitation email for each new invite
      const sendEmailPromises = newlyAddedEmails.map(async (inviteeEmail) => {
        // Validate email format
        try {
          if (!emailRegex.test(inviteeEmail)) {
            console.warn(`Invalid email skipped: ${inviteeEmail}`);
            return null;
          }

          // Construct your email message
          const msg = {
            to: inviteeEmail,
            from: "jared.lambert@gauntletai.com", // Replace with your verified sender
            subject: "You've been invited to join a workspace on Zapzing!",
            text: `Sign up at https://zappzingg.web.app and use this workspace code: ${workspaceUid}`,
            html: `
          <p>You've been invited to join a workspace on <strong>Zapzing</strong>!</p>
          <p>Sign up at <a href="https://zappzingg.web.app">https://zappzingg.web.app</a> and use this workspace code:</p>
          <h3>${workspaceUid}</h3>
          <p>Thanks,<br>The Zapzing Team</p>
        `,
          };

          await sgMail.send(msg);
          console.log(`Email sent successfully to: ${inviteeEmail}`);
        } catch (error) {
          console.error(`Error sending email to ${inviteeEmail}:`, error);
        }
      });

      // Wait for all emails to be processed
      await Promise.all(sendEmailPromises);
    } catch (error) {
      console.error("Error sending emails:", error);
      return null;
    }

    return null;
  }
);

exports.onMessageCreated = functions.firestore
  .document("messages/{messageId}")
  .onCreate(async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data found");
        return null;
      }
      const messageData = snapshot.data();
      if (!messageData) {
        console.log("No message data found");
        return null;
      }

      console.log("messageData", messageData);

      // Extract relevant fields from the newly created message
      const channelId = messageData.channel;
      const senderUid = messageData.senderUid;  // Now using senderUid directly
      const messageText = messageData.text;

      // Get the channel document to retrieve the workspaceId
      const channelDoc = await getFirestore()
        .collection("channels")
        .doc(channelId)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${channelId} does not exist`);
        return null;
      }

      const channelData = channelDoc.data();
      const tokens = [];
      const workspaceId = channelData.workspaceId;

      if (channelData.dm) {
        console.log("DM channel");
        // For DM channels, find the other user's UID
        const recipientUid = channelData.dm.find(uid => uid !== senderUid);

        if (recipientUid) {
          const userDoc = await getFirestore()
            .collection("users")
            .doc(recipientUid)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const { fcmToken, blockedUsers = [], mutedDMs = [] } = userData;

            if (fcmToken && !blockedUsers.includes(senderUid) && !mutedDMs.includes(channelId)) {
              tokens.push(fcmToken);
            }
          }
        }
      } else {
        // For regular channels
        const workspaceDoc = await getFirestore()
          .collection("workspaces")
          .doc(workspaceId)
          .get();

        if (!workspaceDoc.exists) {
          console.log(`Workspace ${workspaceId} does not exist`);
          return null;
        }

        const workspaceData = workspaceDoc.data();
        const memberUids = workspaceData.members.filter(uid => uid !== senderUid);

        console.log("members", memberUids);

        if (memberUids.length > 0) {
          // Query all users in that workspace
          const usersSnapshot = await getFirestore()
            .collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", memberUids)
            .get();

          usersSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const { blockedUsers = [], mutedChannels = [], fcmToken } = userData;

            // Skip if user has blocked the sender or muted the channel
            if (blockedUsers.includes(senderUid) || mutedChannels.includes(channelId)) {
              return;
            }

            // Collect the token if it exists
            if (fcmToken) {
              tokens.push(fcmToken);
            }
          });
        }
      }

      // Send notifications using the collected tokens
      // ... rest of the notification sending logic ...
    } catch (error) {
      console.error("Error in onMessageCreated:", error);
      return null;
    }
  });

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
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendNotificationOnMessageCreate = onDocumentCreated(
  "message/{messageId}",
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

      // 1) Extract relevant fields from the newly created message.
      const channelId = messageData.channel;
      const sender = messageData.sender; // { displayName, email, photoURL, uid }
      const senderUid = sender.uid;
      const messageText = messageData.text;

      // 2) Get the channel document to retrieve the workspaceId.
      const channelDoc = await admin
        .firestore()
        .collection("channels")
        .doc(channelId)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${channelId} does not exist`);
        return null;
      }

      const channelData = channelDoc.data();
      const workspaceId = channelData.workspaceId;

      // 3) Query all users in that workspace.
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("workspaceId", "==", workspaceId)
        .get();

      if (usersSnapshot.empty) {
        console.log(`No users found for workspaceId: ${workspaceId}`);
        return null;
      }

      // Prepare a list of FCM tokens from users who are eligible to receive the notification.
      const tokens = [];

      // 4) Filter out users who have either muted the channel or blocked the sender.
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const { blockedUsers = [], mutedChannels = [], fcmToken } = userData;

        // Skip if user has blocked the sender or muted the channel.
        if (
          blockedUsers.includes(senderUid) ||
          mutedChannels.includes(channelId)
        ) {
          return; // do not add token
        }

        // Collect the token if it exists.
        if (fcmToken) {
          tokens.push(fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log("No valid FCM tokens to send to.");
        return null;
      }

      // 5) Build the notification payload.
      const payload = {
        notification: {
          title: sender.displayName || "New Message",
          body: messageText,
        },
        data: {
          channelId,
          senderUid,
          workspaceId,
        },
      };

      // 6) Send notifications to all collected tokens via FCM.
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log("FCM response:", response);

      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  }
);

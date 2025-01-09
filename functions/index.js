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
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const admin = require("firebase-admin");

admin.initializeApp();

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

      // 1) Extract relevant fields from the newly created message.
      const channelId = messageData.channel;
      const sender = messageData.sender; // { displayName, email, photoURL, uid }
      const senderUid = sender.uid;
      const messageText = messageData.text;

      // 2) Get the channel document to retrieve the workspaceId.
      const channelDoc = await getFirestore()
        .collection("channels")
        .doc(channelId)
        .get();

      if (!channelDoc.exists) {
        console.log(`Channel ${channelId} does not exist`);
        return null;
      }

      const channelData = channelDoc.data();
      // Prepare a list of FCM tokens from users who are eligible to receive the notification.
      const tokens = [];
      const workspaceId = channelData.workspaceId;

      if (channelData.dm) {
        console.log("DM channel");

        const userId = channelData.dm.find(
          (member) => member.uid !== senderUid
        );

        const userDoc = await getFirestore()
          .collection("users")
          .doc(userId)
          .get();
        const userData = userDoc.data();
        const { fcmToken, blockedUsers = [], mutedChannels = [] } = userData;
        if (
          fcmToken &&
          !blockedUsers.includes(senderUid) &&
          !mutedChannels.includes(channelId)
        ) {
          tokens.push(fcmToken);
        }
      } else {
        const workspaceDoc = await getFirestore()
          .collection("workspaces")
          .doc(workspaceId)
          .get();

        if (!workspaceDoc.exists) {
          console.log(`Workspace ${workspaceId} does not exist`);
          return null;
        }

        const workspaceData = workspaceDoc.data();
        const members = workspaceData.members.filter(
          (member) => member.uid !== senderUid
        );

        console.log("members", members);

        // 3) Query all users in that workspace.
        const usersSnapshot = await getFirestore()
          .collection("users")
          .where(admin.firestore.FieldPath.documentId(), "in", members)
          .get();

        if (usersSnapshot.empty) {
          console.log(`No users found for workspaceId: ${workspaceId}`);
          return null;
        }

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
      }

      if (tokens.length === 0) {
        console.log("No valid FCM tokens to send to.");
        return null;
      }

      // 5) Build the notification payload.
      const message = {
        tokens,
        notification: {
          title: sender.displayName || "New Message",
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

      // 6) Send notifications to all collected tokens via FCM.
      const response = await getMessaging().sendEachForMulticast(message);
      console.log("FCM response:", response);

      return null;
    } catch (error) {
      console.error("Error sending FCM notification:", error);
      return null;
    }
  }
);

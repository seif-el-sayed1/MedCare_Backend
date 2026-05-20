const { getMessaging } = require("firebase-admin/messaging");
const expressAsyncHandler = require("express-async-handler");
const admin = require("firebase-admin");
const serviceAccount = require("../firebaseServiceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const sendNotification = ({
  global,
  topic,
  token,
  title = "",
  body = "",
  caseType = "",
  info = "",
  icon = "",
  isDataOnly = false
}) => {
  // Prepare a message to be sent
  const message = {
    android: {
      priority: "HIGH"
    },
    notification: {
      title,
      body
    },
    data: {
      info,
      case: caseType
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title,
            body,
            icon
          },
          badge: 1,
          "mutable-content": 1,
          sound: "default"
        }
      },
      headers: {
        "apns-priority": "10"
      }
    }
  };

  if (global) message.topic = "global";
  else if (token) message.token = token;
  else if (topic) message.topic = topic;
  else throw new Error("Token or topic is required to send a notification");

  // Send notification
    getMessaging()
      .send(message)
      .then((response) => {
        console.log("Notification is sent successfully: ", response);
      })
      .catch((error) => {
        console.log("Error sending notification:", error);
      });

  // Data-only notification
  if (isDataOnly) {
    delete message.notification;
    delete message.apns.payload.aps.alert;
    delete message.apns.payload.aps.badge;
    delete message.apns.payload.aps.sound;
    delete message.apns.payload.aps["mutable-content"];

    message.apns.payload.aps["content-available"] = 1;
    message.apns.headers["apns-priority"] = "5";

    getMessaging()
      .send(message)
      .then((response) => {
        console.log("Data only notification is sent successfully: ".green.bold, response);
      })
      .catch((error) => {
        console.log("Error sending data only notification:", error);
      });
  }
};

// Function to send notification to an array of tokens
const sendNotificationsToMultipleTokens = ({
  tokens,
  title = "",
  body = "",
  caseType = "",
  info = ""
}) => {
  tokens.forEach((token) => {
    sendNotification({ token, title, body, caseType, info });
  });
};

const saveUsersNotification = expressAsyncHandler(
  async ({
    title = "",
    body = "",
    caseType = "",
    info = "",
    global = false,
    usersIds = [],
    sentBy
  }) => {
    if (usersIds.length > 0) {
      usersIds.forEach(async (userId) => {
        const notification = new Notification({
          title,
          body,
          case: caseType,
          info,
          global,
          user: userId,
          sentBy
        });

        await notification.save();
        console.log("Notification is saved successfully");
        return notification;
      });
    }
  }
);

module.exports = {
  sendNotification,
  saveUsersNotification,
  sendNotificationsToMultipleTokens
};

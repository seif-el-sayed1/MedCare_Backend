const { initializeApp } = require("firebase/app");
const { getStorage } = require("firebase/storage");
const admin = require("firebase-admin");

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NODE_ENV === "production" ? process.env.FIREBASE_API_KEY : process.env.FIREBASE_DEV_API_KEY,
  authDomain: process.env.NODE_ENV === "production" ? process.env.FIREBASE_AUTH_DOMAIN : process.env.FIREBASE_DEV_AUTH_DOMAIN,
  projectId: process.env.NODE_ENV === "production" ? process.env.FIREBASE_PROJECT_ID : process.env.FIREBASE_DEV_PROJECT_ID,
  storageBucket: process.env.NODE_ENV === "production" ? process.env.FIREBASE_STORAGE_BUCKET : process.env.FIREBASE_DEV_STORAGE_BUCKET,
  messagingSenderId: process.env.NODE_ENV === "production" ? process.env.FIREBASE_MESSAGE_SENDER_ID : process.env.FIREBASE_DEV_MESSAGE_SENDER_ID,
  appId: process.env.NODE_ENV === "production" ? process.env.FIREBASE_APP_ID : process.env.FIREBASE_DEV_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const decodeToken = async (idToken) => {
  const userData = await admin.auth().verifyIdToken(idToken);
  return userData;
};

const storage = getStorage(app);
module.exports = { storage, decodeToken };
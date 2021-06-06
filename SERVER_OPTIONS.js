// DO NOT MODIFY THE LINES BELOW
// creds informaiton
exports.ENABLE_CREDS = false;
exports.CREDS_LOCATION = null;

// cert info
exports.ENABLE_CERT = true;
exports.CCA_X_ORIGIN = "x.origin.cloudflare";
exports.CERT_PRIVATE = "/etc/apache2/key.pem";
exports.CERT_CERT = "/etc/apache2/cert.pem";

// socketio settings
exports.SOCKET_SECURE = "inherit";
exports.CORS_ORIGIN = "inherit";
exports.METHODS = ["GET", "POST"];

// general settings
exports.PORT = 8443;

// DO NOT MODIFY THE LINES ABOVE
// ONLY CHANGE THIS LINE!
exports.DEVELOPMENT_MODE = true;
// False = starkingdoms.tk server settings
// True = localhost server settings

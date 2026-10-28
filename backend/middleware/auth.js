const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      error: "Authentication token is required.",
    });
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({
      error: "Invalid authorization header.",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      error: "Authentication is not configured.",
    });
  }

  try {
    req.user = jwt.verify(match[1], secret, {
      algorithms: ["HS256"],
    });

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        error: "Invalid or expired authentication token.",
      });
    }

    return next(error);
  }
}

module.exports = authenticateToken;

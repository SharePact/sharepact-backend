exports.comprehensiveLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      status: res.statusCode,
      responseTime: `${duration}ms`,
    };
    console.log(JSON.stringify(log, null, 2));
  });

  next();
};

exports.requestLogger = (req, res, next) => {
  // skip logging these requests
  if (req.path === "/api/v0/swarm/peers" && req.query.timeout === "2500ms") {
    return next();
  }
  const start = Date.now();

  //   TODO: integrate actual level
  const level = "debug";

  let responseSize = 0;

  // Hook into the response write method
  const originalWrite = res.write;
  res.write = (...args) => {
    responseSize += Buffer.byteLength(args[0]);
    originalWrite.apply(res, args);
  };

  // Hook into the response end method
  const originalEnd = res.end;
  res.end = (...args) => {
    if (args[0]) {
      responseSize += Buffer.byteLength(args[0]);
    }
    originalEnd.apply(res, args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `time="${start}" level=${level} msg="${req.ip} - - \"${req.method} ${req.originalUrl} HTTP/1.0\" ${res.statusCode} ${responseSize} ${duration}ms"`
    );
  });

  next();
};

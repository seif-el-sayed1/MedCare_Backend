const path = require("path");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const AppRoutes = require("../routes/index.routes");
const globalError = require("../middlewares/error.middleware");

module.exports = (app) => {
  // Middlewares
  app.use(cors());
  app.use(compression());

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.json({ limit: "25kb" }));

  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
  );

  // Request body/query logging — development only
  if (process.env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
      if (["post", "patch", "delete"].includes(req.method.toLowerCase())) {
        if (req.files)
          console.log(`🚀 ~ req.files: ${req.method} ${req.path}\n`, req.files);
        console.log(`🚀 ~ req.body: ${req.method} ${req.path}\n`, req.body);
      } else if (req.method.toLowerCase() === "get") {
        console.log(`🚀 ~ req.query: ${req.method} ${req.path}\n`, req.query);
      }
      next();
    });
  }

  // All App Routes
  app.use(AppRoutes);

  // Global Error Handler
  app.use(globalError);
};
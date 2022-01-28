// General imports
const express = require("express");
const cors = require("cors");

// Firebase imports
const functions = require("firebase-functions");

// Local imports
const { HTTP, SERVER_REGION } = require("./util");
const luckyNumbersRoute = require("./routes/luckyNumbers");
const newsRoute = require("./routes/news");
const linksRoute = require("./routes/links");
const calendarRoute = require("./routes/calendar");
const eventsRoute = require("./routes/events");

// initialise express
const app = express();

app.use(cors({ origin: true }));
app.use("/api/luckyNumbers/", luckyNumbersRoute);
app.use("/api/news/", newsRoute);
app.use("/api/links/", linksRoute);
app.use("/api/calendar/", calendarRoute);
app.use("/api/events/", eventsRoute);

// define the routes that the API is able to serve
const definedRoutes = ["luckyNumbers", "news", "links", "calendar", "events"];

for (const route of definedRoutes) {
  // catch all requests to paths that are listed above but use the incorrect HTTP method
  for (const pathSuffix of ["/", "/:foo/"]) {
    app.all("/api/" + route + pathSuffix, (req, res) => {
      return res.status(405).json({
        errorDescription: `${HTTP.err405}Cannot ${req.method} '${req.path}'.`,
      });
    });
  }
}

// catch all requests to paths that are not listed above
app.all("*", (req, res) => {
  return res.status(404).json({
    errorDescription: `${HTTP.err404}The server could not locate the resource at '${req.path}'.`,
  });
});

exports.app = functions.region(SERVER_REGION).https.onRequest(app);

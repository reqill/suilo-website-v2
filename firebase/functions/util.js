const admin = require("firebase-admin");

// Private service account key
const serviceAccount = require("./permissions.json");

// Authorise Firebase
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Assign database reference
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Initialise HTTP error constants
const HTTP400 = "400 Bad Request: ";
const HTTP404 = "404 Not Found: ";
const HTTP405 = "405 Method Not Allowed: ";
const HTTP500 = "500 Internal Server Error: ";

/*      ======== GENERAL UTIL FUNCTIONS ========      */

/** Converts each Firebase timestamp in the object into a JavaScript Date object. */
function formatTimestamps(dataObject) {
  Object.keys(dataObject).forEach((key) => {
    try {
      // Check if the object contains Firebase timestamp fields
      if (dataObject[key]._seconds === undefined) {
        return;
      }
    } catch {
      // The field is not a Firebase timestamp
      return;
    }
    const nanoseconds = dataObject[key]._nanoseconds ?? 0;
    const additionalSeconds = nanoseconds / Math.pow(10, 9);
    const seconds = dataObject[key]._seconds + additionalSeconds;
    const date = new Date(seconds * 1000); // Date object constructor takes milliseconds
    dataObject[key] = date.toJSON();
  });
}

/** Converts a JavaScript Date object into a Firestore timestamp. */
function dateToTimestamp(date) {
  return admin.firestore.Timestamp.fromDate(date);
}

/** Checks if the request params or query contains a document ID.
 * If so, calls the success callback with a reference to the document with the specified ID.
 * Otherwise calls the failure callback if specified, or sends a HTTP 400 response.  */
function getDocRef(req, res, collectionName) {
  // get id from url parameters or arguments, e.g. /api/news/foo or /api/news/?id=foo
  const id = req.params.id ?? req.query.id;

  function defaultReject() {
    // default to sending a HTTP 400 response
    res
      .status(400)
      .json({ errorDescription: HTTP400 + "No document ID specified." });
  }

  function _getRef(resolve = (docRef) => docRef, reject = defaultReject) {
    // check if the id was provided in the query parameters
    if (id) {
      // initialise query
      const docRef = db.collection(collectionName).doc(id);
      // validation success; execute the given callback function
      resolve(docRef);
    } else {
      // id not provided, call the failure callback
      reject();
    }
  }
  return { then: _getRef };
}

/** Splits the string with the given separator and casts each resulting array element into an integer.
 * If any array element is NaN, the appropriate array for the default input argument is returned, or null.
 */
function getIntArray(string, separator, defaultInput) {
  let anyNaN = false;

  function parseNum(num) {
    const int = parseInt(num);
    // set anyNaN to true if 'int' is not a number
    anyNaN = anyNaN || isNaN(int);
    return int;
  }

  const tmp = (string ?? "").split(separator).map((num) => parseNum(num));
  if (anyNaN) {
    return defaultInput ? getIntArray(defaultInput, separator) : null;
  }
  return tmp;
}

/** This function is called whenever an update is made to any collection (POST/PUT/DELETE). It updates
 * the information stored in the lastUpdated document to accurately show when the last update was made.
 */
function updateCollection(collectionName) {
  // Set the last updated time for the collection to the current date
  const newData = { [collectionName]: admin.firestore.Timestamp.now() };
  db.collection("_general").doc("lastUpdate").set(newData, { merge: true });
}

/*      ======== GENERAL CRUD FUNCTIONS ========      */

/** Creates a single document with the specified data in the specified collection and sends the appropriate response. */
function createSingleDocument(data, res, collectionName) {
  // attempts to add the data to the given collection
  db.collection(collectionName)
    .add(data)
    .then((doc) => {
      updateCollection(collectionName);
      // success; return the data along with the document id
      formatTimestamps(data);
      return res.status(200).json({ id: doc.id, ...data });
    })
    .catch((error) => {
      // return an error when the document could not be added, e.g. invalid collection name
      return res.status(500).json({
        errorDescription:
          HTTP500 + "The specified document could not be created.",
        errorDetails: error.toString(),
      });
    });
}

/** Sends a response containing the data of the specified document query. */
function sendSingleResponse(docRef, res, sendData = (data) => data) {
  // send the query to database
  docRef.get().then((doc) => {
    // check if the document was found
    const data = doc.data();
    if (!data) {
      // return an error if the document was not found
      return res.status(404).json({
        errorDescription: HTTP404 + "The requested document was not located.",
      });
    }
    // formats all existing date fields as timestamp strings
    formatTimestamps(data);
    // increment the views count or start at 1 if it doesn't exist
    const views = (data.views ?? 0) + 1;
    // update views count in database
    docRef.update({ views }).then(() => {
      // send document id with rest of the data
      return res.status(200).json(sendData({ id: doc.id, ...data, views }));
    });
  });
}

/** Sends a response containing an array with the contents of the collection query.
 *
 * @param {FirebaseFirestore.Query<FirebaseFirestore.DocumentData>} docListQuery the query to execute
 * @param {object} queryOptions an object with defaults: { page = 1, items = 25, all = false }
 * @param {response} res the HTTP response
 * @param {function} callback (responseArray, querySnapshotDocuments)
 */
function sendListResponse(docListQuery, queryOptions, res, callback = null) {
  // initialise parameters
  // ensure the values are >= 1
  const page = Math.max(parseInt(queryOptions.page ?? 1), 1);
  const items = Math.max(parseInt(queryOptions.items ?? 25), 1);

  // don't limit the response length if the 'all' parameter is set to "true"
  if (queryOptions.all === "true") {
    var startIndex = 0;
  } else {
    // will only get the documents after startIndex
    var startIndex = items * (page - 1);
    docListQuery = docListQuery.offset(startIndex).limit(items);
  }

  function defaultCallback(error, responseArray, collectionDocs) {
    if (error) {
      console.log(error);
      return res.status(500).json({
        errorDescription: HTTP500 + "Could not retrieve the documents.",
        errorDetails: error.toString(),
      });
    }
    return res.status(200).json({
      // add extra info for messages such as "showing items X-Y of Z"
      firstOnPage: startIndex + !!collectionDocs.length, // increment by 1 if there is at least 1 document in the list
      lastOnPage: startIndex + collectionDocs.length,
      contents: responseArray,
    });
  }

  // initialise response as an empty array
  const response = [];

  // send the query to database
  docListQuery
    .get()
    .then((querySnapshot) => {
      // initialise extra info variables
      // loop through every document
      querySnapshot.forEach((doc) => {
        // increments index after evaluating it to see if it should be included in the response
        // read the document
        const data = doc.data();
        if (data) {
          // formats all specified date fields as strings if they exist
          formatTimestamps(data);
          response.push({ id: doc.id, ...data });
        }
      });
      return (callback ?? defaultCallback)(null, response, querySnapshot.docs);
    })
    .catch(callback ?? defaultCallback);
}

/** Updates the document fields and sends a response containing the new data.
 *
 * @param {FirebaseFirestore.DocumentReference} docRef
 * @param {response} res the HTTP response
 * @param {object} requestParams an object containing key-value pairs of the fields to update
 * @param {object} attributeSanitisers an object containing key-value pairs of attribute names and sanitation functions that validate the input
 */
function updateSingleDocument(req, res, collectionName, attributeSanitisers) {
  // initialise new data
  const newData = {
    // add parameter indicating when the news was last edited
    modified: admin.firestore.Timestamp.now(),
  };
  // initialise boolean to indicate if any parameters were updated
  let dataUpdated = false;
  // loop through each attribute that should be set
  for (const attrib in attributeSanitisers) {
    if (!req.query[attrib]) {
      // the attribute is not present in the request query
      continue;
    }
    // sanitise the request query value
    const sanitiser = attributeSanitisers[attrib];
    const sanitisedValue = sanitiser(req.query[attrib]);

    // assign the sanitised value to the updated data object
    newData[attrib] = sanitisedValue;

    // mark the data as having been updated
    dataUpdated = true;
  }
  if (!dataUpdated) {
    // return an error if the query does not contain any new assignments
    return res.status(400).json({
      errorDescription: HTTP400 + "There were no updated fields provided.",
    });
  }
  // get the document reference
  getDocRef(req, res, collectionName).then((docRef) => {
    // send the query to database
    docRef
      .update(newData)
      .then(() => {
        updateCollection(collectionName);
        // send query to db
        sendSingleResponse(docRef, res);
      })
      .catch((error) => {
        // return an error when the document was not found/could not be updated
        return res.status(400).json({
          errorDescription:
            HTTP400 +
            "Could not update the specified document. It most likely does not exist.",
          errorDetails: error.toString(),
        });
      });
  });
}

/** Deletes a document from the database and sends the appropriate response.
 * Note: the action will be treated as success even if the document didn't exist before.
 * This is due to how the Firebase Firestore API works.
 *
 * @param {FirebaseFirestore.DocumentReference} docRef a reference to the document to delete
 * @param {response} res the HTTP response
 */
function deleteSingleDocument(req, res, collectionName) {
  getDocRef(req, res, collectionName).then((docRef) => {
    docRef
      .delete()
      .then(() => {
        // success deleting document
        // this may occur even if the document did not exist to begin with
        updateCollection(collectionName);
        return res.status(200).json({
          msg: `Success! Document with ID '${docRef.id}' has been deleted.`,
        });
      })
      .catch((error) => {
        return res.status(500).json({
          errorDescription:
            HTTP500 +
            "Could not delete the specified document. This does not mean that it doesn't exist.",
          errorDetails: error.toString(),
        });
      });
  });
}

module.exports = {
  admin,
  db,
  HTTP: {
    err400: HTTP400,
    err404: HTTP404,
    err405: HTTP405,
    err500: HTTP500,
  },
  formatTimestamps,
  dateToTimestamp,
  getDocRef,
  getIntArray,
  updateCollection,
  createSingleDocument,
  sendSingleResponse,
  sendListResponse,
  updateSingleDocument,
  deleteSingleDocument,
};

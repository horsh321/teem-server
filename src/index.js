import app from "./app.js";
import { connectToDb } from "./config/connectToDb.js";
import env from "./utils/validateEnv.js";

const port = env.PORT || 5005;

//check if port exist
if (!port || !env.MONGO_URI) {
  throw new Error(
    "Please ensure that you have a port and your MONGO connection in place"
  );
}

connectToDb()
  .then(() => startServer())
  .catch((error) => {
    console.log("Invalid database connection", error);
  });

function startServer() {
  app.listen(port, (error) => {
    if (error) {
      console.log("Cannot connect to server", error);
    } else {
      console.log(`Server is connected to port ${port}`);
    }
  });
}

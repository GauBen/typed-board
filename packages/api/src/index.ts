import { EnvelopArmorPlugin } from "@escape.tech/graphql-armor";
import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { schema, writeSchema } from "./schema.js";

// Create a Yoga instance with the schema
const yoga = createYoga({
  schema,
  // GraphQL Armor protects from common vulnerabilities
  // See https://github.com/Escape-Technologies/graphql-armor
  // for more information
  plugins: [EnvelopArmorPlugin()],
});

// Start an HTTP server on port 4000
createServer(yoga).listen(4000, () => {
  console.log("Server is running on http://localhost:4000/graphql");
});

// Save the schema to `build/schema.graphql`
await writeSchema();

# Achieving end-to-end type safety in a modern JS GraphQL stack

In this article, we'll create a simple GraphQL application, a message board, by combining a lot of recent open-source technologies. This article aims to be a showcase of technologies that work well together rather than a complete tutorial on project setup.

## What is _end-to-end_ type safety?

Type safety is a property of a program that guarantees that all values types are known at compile time. It prevents a lot of bugs before running the program. The most common way to achieve type safety in JavaScript is to use TypeScript.

```ts
// Declare an object shape:
interface User {
  name: string;
  email: string;
}

const sendMail = (user: User) => {};

// This works:
sendMail({ name: "John", email: "john@example.com" });

// This doesn't:
sendMail("john@example.com");
//       ~~~~~~~~~~~~~~~~~~ (x) Argument of type 'string' is not assignable to parameter of type 'User'.
```

When using TypeScript in a project, you get type safety in this very project. **End-to-end type safety, on the contrary, is achieved when several projects interact in a type-safe way.**

In this article, we'll only use type-safe technologies: SQLite for the database, TypeScript for the server and the application, and GraphQL as a way to interact between them.

## Dataflow

[diagram]

Database --> Backend --> Frontend

## Project setup

If you want to have everything working by the end of this article, you can follow the steps below. Otherwise, you can skip to the next section.

If you don't have Node or Yarn on your machine, you can install them easily with [Volta](https://volta.sh/):

```bash
# Install the latest versions of Node and Yarn
volta install node@latest
volta install yarn@latest

# Create a new project
mkdir typed-board && cd $_

# Setup a monorepo with Yarn 4
yarn init --private --workspace --install=4.0.0-rc.22

# Enable the good ol' node_modules
echo "nodeLinker: node-modules" >> .yarnrc.yml
echo "node_modules/\nbuild/" >> .gitignore
```

We'll use Yarn 4 because it ships with a few tools to manage monorepos that we'll use later.

## Prisma

[Prisma](https://www.prisma.io/) is an ORM for Node.js and TypeScript, focused on developer experience. Among all of its features, Prisma offers a top-notch type-safe database client.

```bash
# Create a new package for the GraphQL API
mkdir -p packages/api && cd $_

# Initialize a new project
yarn init --private

# Install a few dependencies to get going
yarn add --dev typescript @types/node tsx @tsconfig/node18-strictest-esm prisma
yarn add @prisma/client
```

The last command installs the following tools:

- [TypeScript](https://www.typescriptlang.org/), to check that our code is type-safe, and [type definitions for Node.js](https://www.npmjs.com/package/@types/node);
- [TSX](https://github.com/esbuild-kit/tsx), to run TypeScript without compiling the code;
- A [`tsconfig.json` preset](https://github.com/tsconfig/bases/blob/main/bases/node18-strictest-esm.combined.json) that ensures type safety;
- [Prisma](https://www.prisma.io/), to interact with the database.

```bash
# Bootstrap a Prisma project
yarn prisma init --datasource-provider sqlite
```

This command creates a few files, but the most interesting one is `prisma/schema.prisma`. Prisma offers to describe a database through a schema file. We'll use this file to have Prisma create the tables for us.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Let's declare a Post table, with 3 columns
model Post {
  id    Int    @id @default(autoincrement())
  title String
  body  String
}
```

This `model` declares that we want a `Post` table with 3 columns. Our database doesn't exist yet, so let's create it:

```bash
# Ask prisma to "push" our changes to the database
yarn prisma db push

# Ignore the SQLite database
echo "dev.db" >> .gitignore
```

Everything is up and running! Prisma created a database for us in `packages/api/prisma/dev.db`.

Let's try to interact with it: create a file named `packages/api/src/index.ts` and with the following code:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Insert a new post
await prisma.post.create({
  data: {
    title: "Hello World",
    body: "This is the first post",
  },
});

// Print all posts
console.log(await prisma.post.findMany());
```

To run this code we'll need to complete the TypeScript setup:

### 1. Create a `tsconfig.json` file in `packages/api`

Let's use the preset we installed earlier:

```json
{
  "extends": "@tsconfig/node18-strictest-esm/tsconfig.json",
  "compilerOptions": {
    "exactOptionalPropertyTypes": false,
    "outDir": "./build"
  }
}
```

### 2. Update the `package.json`

The following lines tell Node.js that we write [ECMAScript modules](https://nodejs.org/api/esm.html#introduction) rather than CommonJS modules. In other words, we'll use `import` rather than `require()`.

```json
{
  "name": "api",
  "dependencies": {
    "@prisma/client": "^4.4.0"
  },
  "devDependencies": {
    "@tsconfig/node18-strictest-esm": "^1.0.1",
    "prisma": "^4.4.0",
    "tsx": "^3.9.0",
    "typescript": "^4.8.4"
  },
  "packageManager": "yarn@4.0.0-rc.22",
  "private": true,
  // Add the following lines: (without this comment)
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch --clear-screen=false src/index.ts"
  },
  "type": "module"
}
```

### 3. Fasten your seatbelt, we're ready for takeoff

```bash
# Type-check and build the project
yarn build

# Run the code in watch mode (every time you save a file, it will be re-run)
yarn dev
```

You should see your first post printed in the console. **Hello World!**

Thanks to Prisma, all the arguments and return values are typed, allowing **TypeScript to catch typos and provide relevant autocompletion.**

We're done for the database part. Let's move on to the backend.

## Pothos

[Pothos](https://pothos-graphql.dev/) is a breeze of fresh air when it comes to building GraphQL APIs. It's a framework that lets you write code-first GraphQL APIs with an emphasize on _pluginability_ and type safety. **And it has an awesome Prisma integration!** (I'm genuinely excited about this one, it makes my life so much easier.)

We'll add a GraphQL API on top of our database, with a query to get articles and a mutation to create a new one.

Let's install Pothos and [Yoga](https://www.the-guild.dev/graphql/yoga-server) in the `packages/api` directory:

```bash
# Install Pothos, Yoga and GraphQL Armor
yarn add @pothos/core @pothos/plugin-prisma graphql graphql-yoga@three @escape.tech/graphql-armor

# Setup the Prisma-Pothos integration
echo 'generator pothos {\nprovider = "prisma-pothos-types"\n}' >> prisma/schema.prisma
yarn prisma generate
```

Let's create a few files to define a simple GraphQL API:

### `src/schema.ts`

This file will contain our queries and mutations. It's a good a good practice to separate the schema file in several files to allow it scale, the [Pothos documentation has dedicated section](https://pothos-graphql.dev/docs/guide/app-layout) about it, but we'll keep it simple for now.

```ts
import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { PrismaClient } from "@prisma/client";
import { printSchema } from "graphql";
import { writeFile } from "node:fs/promises";

// Instantiate the Prisma client
const prisma = new PrismaClient();

// Instantiate the schema builder with the Prisma plugin
const builder = new SchemaBuilder<{ PrismaTypes: PrismaTypes }>({
  plugins: [PrismaPlugin],
  prisma: { client: prisma },
});

// Declare a `Post` GraphQL type, based on the table of the same name
const PostType = builder.prismaObject("Post", {
  fields: (t) => ({
    // Expose only the underlying data we want to expose
    id: t.exposeID("id"),
    title: t.exposeString("title"),
    body: t.exposeString("body"),
  }),
});

builder.queryType({
  fields: (t) => ({
    // Declare a new query field, `posts`, which returns a list of `Post`s
    posts: t.prismaField({
      type: [PostType], // An array of posts
      resolve: async (query) =>
        // Return all posts, oldest first
        prisma.post.findMany({ ...query, orderBy: { id: "desc" } }),
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    // Declare a new mutation field, `createPost`, which creates a new `Post`
    createPost: t.prismaField({
      type: PostType,
      // The mutation takes a `title` and `body` arguments
      args: {
        title: t.arg.string({ required: true }),
        body: t.arg.string({ required: true }),
      },
      resolve: async (query, _, { title, body }) =>
        // Create a post and return it
        prisma.post.create({ ...query, data: { title, body } }),
    }),
  }),
});

/** Application schema. */
export const schema = builder.toSchema();

/** Saves the schema to `build/schema.graphql`. */
export const writeSchema = async () =>
  writeFile(
    new URL("build/schema.graphql", `file:///${process.cwd()}/`),
    printSchema(schema)
  );
```

This is enough to declare a type, a query and a mutation. You can read the resulting schema in `build/schema.graphql`. It should look like this:

```graphql
# No need to copy this, it is automatically generated!
type Post {
  id: ID!
  body: String!
  title: String!
}

type Query {
  posts: [Post!]!
}

type Mutation {
  createPost(body: String!, title: String!): Post!
}
```

### `src/index.ts`

This file will be the entry point of our application. It creates the GraphQL server and starts it.

```ts
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
  console.info("Server is running on http://localhost:4000/graphql");
});

// Save the schema to `build/schema.graphql`
await writeSchema();
```

### `src/post-build.ts`

This is not necessary to run the application, but it'll come handy to have a simple way to generate the schema file. We'll use it in the next step.

```ts
import { writeSchema } from "./schema.js";

await writeSchema();
console.log("✨ Schema exported");
```

### Update the build script in `package.json`

```json
{
  "scripts": {
    // Update this line to build the API
    "build": "prisma generate && tsc && yarn node ./build/post-build.js"
  }
}
```

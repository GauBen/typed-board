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
# Install Pothos and Yoga
yarn add @pothos/core @pothos/plugin-prisma graphql graphql-yoga@three

# Setup the Prisma-Pothos integration
echo 'generator pothos {\nprovider = "prisma-pothos-types"\n}' >> prisma/schema.prisma
yarn prisma generate
```

Let's create a few files for the API to work:

### `src/schema.ts`

This file will contain our queries and mutations. It's a good a good practice to separate the schema file in several files to allow it scale, the [Pothos documentation has dedicated section](https://pothos-graphql.dev/docs/guide/app-layout) about it, but we'll keep it simple for now.

```ts

```

### `src/build.ts`

```ts

```

### `src/index.ts`

```ts

```

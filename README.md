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
```

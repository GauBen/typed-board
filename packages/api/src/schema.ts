import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import type PrismaTypes from "@pothos/plugin-prisma/generated";
import { PrismaClient } from "@prisma/client";
import { printSchema } from "graphql";
import { mkdir, writeFile } from "node:fs/promises";

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
      resolve: (query) =>
        prisma.post.findMany({ ...query, orderBy: { id: "desc" } }),
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    // Declare a new mutation field, `createPost`, which creates a new `Post`
    createPost: t.prismaField({
      type: PostType,
      args: {
        title: t.arg.string({ required: true }),
        body: t.arg.string({ required: true }),
      },
      resolve: (query, _, { title, body }) =>
        prisma.post.create({ ...query, data: { title, body } }),
    }),
  }),
});

export const schema = builder.toSchema();

export const writeSchema = async () => {
  await mkdir(new URL(`file:///${process.cwd()}/build/`), { recursive: true });
  return writeFile(
    new URL("build/schema.graphql", `file:///${process.cwd()}/`),
    printSchema(schema)
  );
};

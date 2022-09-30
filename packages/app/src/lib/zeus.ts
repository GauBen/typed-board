import type { LoadEvent } from "@sveltejs/kit";
import { Thunder, type ValueTypes } from "../zeus/index";

/** A function that allows using Zeus with a custom `fetch` function. */
const thunder = (fetch: LoadEvent["fetch"]) =>
  Thunder((query, variables) =>
    fetch("http://localhost:4000/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    })
      // Errors are not properly handled by this code, but you get the idea
      .then((response) => response.json())
      .then(({ data }) => data)
  );

/** A nice wrapper around the unfriendly `thunder` above. */
export const query = async <Query extends ValueTypes["Query"]>(
  query: Query,
  { fetch }: { fetch: LoadEvent["fetch"] }
) => thunder(fetch)("query")(query); // That's a lot of parentheses

/** Same, but for mutations. */
export const mutate = async <Mutation extends ValueTypes["Mutation"]>(
  mutation: Mutation
  // No need for a custom fetch function here, since mutations are
  // never sent during server-side rendering
) => thunder(fetch)("mutation")(mutation);

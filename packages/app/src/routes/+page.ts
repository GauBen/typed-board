import { query } from "$lib/zeus";
import type { PageLoad } from "./$types";

/** This gets called on both the server and the client to provide page data. */
export const load: PageLoad = async ({ fetch }) =>
  // Perform a GraphQL query
  query(
    {
      // Query the `posts` field with all three columns
      posts: {
        // It looks a bit like Prisma, doesn't it?
        id: true,
        title: true,
        body: true,
      },
    },
    // Giving fetch allows server-side rendering
    { fetch }
  );

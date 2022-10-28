<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { mutate } from "$lib/zeus";
  import type { PageData } from "./$types";

  // `export` means that `data` is a prop
  export let data: PageData; // PageData is provided by SvelteKit

  // Variables bound to the form inputs
  let title = "";
  let body = "";

  /** Sends the `createPost` mutation and refreshes the page. */
  const createPost = async () => {
    await mutate({ createPost: [{ body, title }, { id: true }] });
    await invalidateAll();
    title = body = "";
  };
</script>

<main>
  <h1>Typed Board</h1>
  <form on:submit|preventDefault={createPost}>
    <h2>New post</h2>
    <p>
      <label>Title: <input type="text" bind:value={title} required /></label>
    </p>
    <p>
      <label>Body: <textarea bind:value={body} rows="5" required /></label>
    </p>
    <p style:text-align="center">
      <button type="submit">Post!</button>
    </p>
  </form>
  <!-- `data.posts` is fully typed! -->
  {#each data.posts as post}
    <article>
      <!--
        Our tools tell us that `post` is of type
        `{
          id: string;
          title: string;
          body: string;
        }`
        If you remove `title: true` from `+page.ts`, you will see an error below
      -->
      <h2>{post.title}</h2>
      <pre>{post.body}</pre>
    </article>
  {/each}
</main>

<style>
  /* Let's add a bit of CSS magic... */
  :global(body) {
    font-family: system-ui, sans-serif;
    background-color: #fff6ec;
  }

  main {
    max-width: 60rem;
    margin: 2rem auto;
  }

  article,
  form {
    background-color: #fff;
    overflow: hidden;
    margin-block: 1rem;
    padding-inline: 1rem;
    box-shadow: 0 0 0.5rem #3001;
    border-radius: 0.25rem;
  }

  label {
    display: flex;
    gap: 0.25rem 0.5rem;
    flex-wrap: wrap;
  }

  input {
    flex: 1;
  }

  textarea {
    width: 100%;
    resize: vertical;
  }

  button {
    padding: 0.25em 0.5em;
  }
</style>

<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { mutate } from "$lib/zeus";
  import type { PageData } from "./$types";

  export let data: PageData;
  let title = "";
  let body = "";

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
  {#each data.posts as post}
    <article>
      <h2>{post.title}</h2>
      <pre>{post.body}</pre>
    </article>
  {/each}
</main>

<style>
  :global(body) {
    font-family: system-ui, sans-serif;
    background-color: #fff9f3;
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

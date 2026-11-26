import { getCollection, type CollectionEntry } from "astro:content";

export type BlogPost = CollectionEntry<"blog">;

function sortPosts(posts: BlogPost[]) {
    return posts.sort(
        (left, right) =>
            right.data.pubDate.valueOf() - left.data.pubDate.valueOf(),
    );
}

export async function getBlogPosts(options?: { includeDrafts?: boolean }) {
    const includeDrafts = options?.includeDrafts ?? !import.meta.env.PROD;
    const posts = await getCollection("blog", ({ data }) =>
        includeDrafts ? true : !data.draft,
    );

    return sortPosts(posts);
}

export async function getDraftBlogPosts() {
    const posts = await getCollection("blog", ({ data }) => data.draft);
    return sortPosts(posts);
}

export function formatBlogDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

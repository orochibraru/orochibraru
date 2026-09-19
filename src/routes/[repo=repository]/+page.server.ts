import { loadProjectPage } from "$lib/server/project-pages";
import { REPOSITORIES } from "$lib/site";

export const entries = () => [...REPOSITORIES].map((repo) => ({ repo }));

export const load = async ({ params }) => loadProjectPage(params.repo);

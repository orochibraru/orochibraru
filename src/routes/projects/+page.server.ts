import { getProjectsPage, listProjectCards } from "$lib/server/content";

export const load = () => ({ projects: listProjectCards(), copy: getProjectsPage() });

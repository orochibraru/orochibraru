import { getProjectsPage, listProjectCards } from "#lib/server/content.ts";

export const load = () => ({ projects: listProjectCards(), copy: getProjectsPage() });

import { PROJECTS } from "$lib/projects";

export const match = (param: string) => PROJECTS.some((project) => project.key === param);

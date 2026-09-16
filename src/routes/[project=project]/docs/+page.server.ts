import { PROJECTS } from "$lib/projects";

export const entries = () => PROJECTS.map((project) => ({ project: project.key }));

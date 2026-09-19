import { REPOSITORIES } from "$lib/site";

export const match = (param: string) => REPOSITORIES.has(param);

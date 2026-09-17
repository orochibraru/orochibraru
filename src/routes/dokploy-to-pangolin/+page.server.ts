import { highlightCode } from "$lib/server/highlight";

const RUN = `docker run -p 3000:3000 \\
  -e WEBHOOK_SECRET=your-secret \\
  -e PANGOLIN_API_KEY=your-key \\
  orochibraru/dokploy-to-pangolin`;

export const load = async () => ({ run: await highlightCode(RUN, "bash") });

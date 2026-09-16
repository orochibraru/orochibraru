import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ pages: "dist", assets: "dist", strict: true }),
		alias: { $docs: "src/docs" },
		paths: { relative: false },
		typescript: {
			config: (tsconfig) => {
				tsconfig.include.push("../scripts/**/*.ts");
			},
		},
	},
};

export default config;

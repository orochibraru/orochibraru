# Releases

Every merge to `main` goes through [semantic-release](https://semantic-release.gitbook.io/). A
`feat`, `fix`, `perf`, `refactor` or `docs` commit cuts a patch release: it updates
`CHANGELOG.md`, tags `vX.Y.Z`, creates the GitHub release with `bercail-extension-X.Y.Z.zip` attached,
and publishes the image under that tag and `latest`. Pull requests publish a `pr-<number>` image,
and their titles must be Conventional Commits because the squash merge uses them as the commit
message.

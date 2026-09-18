# Host metrics

- **Temperature** is read from `/sys/class/thermal` on Linux. On macOS it needs
  [`osx-cpu-temp`](https://github.com/lavoiesl/osx-cpu-temp) (`brew install osx-cpu-temp`).
- **GPU** usage needs `nvidia-smi` on the host.

A metric that can't be read shows `N/A` without affecting the others.

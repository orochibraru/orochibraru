# Installation

```yaml
services:
  bercail:
    image: orochibraru/bercail:latest
    restart: unless-stopped
    environment:
      ORIGIN: 'https://dash.example.com'
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
```

Data lives in a SQLite file under `/app/data`. Database migrations run automatically on startup.

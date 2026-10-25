//converts a redis:// or rediss:// URL into the options @hocuspocus/extension-redis
export function redisConfigFromUrl(urlString: string) {
  const url = new URL(urlString);
  const dbIndex = url.pathname.slice(1);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    options: {
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      db:
        dbIndex && !Number.isNaN(Number(dbIndex)) ? Number(dbIndex) : undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
    },
  };
}

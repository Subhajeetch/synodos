//converts a redis:// or rediss:// URL into the options @hocuspocus/extension-redis
export function redisConfigFromUrl(urlString: string) {
  const url = new URL(urlString);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    options: {
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
    },
  };
}
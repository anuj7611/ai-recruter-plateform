import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

export const createQueueRedisConnection = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
  });
};

export const createWorkerRedisConnection = () => {
  return new Redis(redisUrl, {
    /*
     * BullMQ workers require this
     * setting so blocking commands
     * work correctly.
     */
    maxRetriesPerRequest: null,
  });
};

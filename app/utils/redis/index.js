const Redis = require('ioredis');
const { logger } = require('../logging');

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
  logger.info('Redis (courier data) ✅');
});

redis.on('error', (err) => {
  logger.info('❌ Redis:', err);
});

const COURIER_ACTIVITY_PREFIX = 'courier_activity_';
const COURIER_PREFIX = 'courier_';
const DEFAULT_EXPIRY = 3600; // 1 hour in seconds

const redisUtils = {
  async getOrSetCourierActivity(phoneNum, fetchFunction) {
    const key = COURIER_ACTIVITY_PREFIX + phoneNum;
    try {
      let data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      data = await fetchFunction();
      await redis.setex(key, DEFAULT_EXPIRY, JSON.stringify(data));
      return data;
    } catch (error) {
      logger.error(`Redis error for courier activity ${phoneNum}: ${error}`);
      return null;
    }
  },

  async updateCourierActivity(phoneNum, data) {
    const key = COURIER_ACTIVITY_PREFIX + phoneNum;
    try {
      await redis.setex(key, DEFAULT_EXPIRY, JSON.stringify(data));
    } catch (error) {
      logger.error(`Redis error updating courier activity ${phoneNum}: ${error}`);
    }
  },

  async getOrSetCourier(phoneNum, fetchFunction) {
    const key = COURIER_PREFIX + phoneNum;
    try {
      let data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      data = await fetchFunction();
      await redis.setex(key, DEFAULT_EXPIRY, JSON.stringify(data));
      return data;
    } catch (error) {
      logger.error(`Redis error for courier ${phoneNum}: ${error}`);
      return null;
    }
  },

  async updateCourier(phoneNum, data) {
    const key = COURIER_PREFIX + phoneNum;
    try {
      await redis.setex(key, DEFAULT_EXPIRY, JSON.stringify(data));
    } catch (error) {
      logger.error(`Redis error updating courier ${phoneNum}: ${error}`);
    }
  },

  async invalidateCourierActivity(phoneNum) {
    const key = COURIER_ACTIVITY_PREFIX + phoneNum;
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Redis error invalidating courier activity ${phoneNum}: ${error}`);
    }
  },

  async invalidateCourier(phoneNum) {
    const key = COURIER_PREFIX + phoneNum;
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Redis error invalidating courier ${phoneNum}: ${error}`);
    }
  }
};

module.exports = redisUtils;
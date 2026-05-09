// ============================================================================
// ERROR 1484 (verbatimModuleSyntax) & ERROR 2351 (Not Constructable)
// ============================================================================
// WHAT THEY MEANT:
// - Code 1484: Your tsconfig has 'verbatimModuleSyntax' enabled. This strictly 
//   forces you to mark types with the 'type' keyword so the compiler knows 
//   exactly what to strip out when converting to JavaScript.
// - Code 2351: Because of your strict module resolution, TypeScript didn't 
//   recognize the default import (`import Redis from 'ioredis'`) as a class 
//   that could be instantiated with the `new` keyword.
//
// HOW WE SOLVED IT:
// We switched to named imports for both. We import the `Redis` class directly, 
// and we explicitly add the `type` keyword before `RedisOptions`.
import 'dotenv/config'; 
import { Redis, type RedisOptions } from 'ioredis';

const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  username:"default",
  password:process.env.REDIS_PASSWORD||"",
  // Required for BullMQ to function correctly without throwing errors
  maxRetriesPerRequest: null, 
  
  // (Optional fix) Adding `times: number` prevents potential implicit 'any' 
  // errors for this specific parameter as well.
  retryStrategy: (times: number) => {
    return Math.min(times * 50, 2000);
  },
};

// Now this works perfectly because `Redis` is properly imported as a class.
export const connection = new Redis(redisOptions);

connection.on('connect', () => console.log('✅ Connected to Redis'));

// ============================================================================
// ERROR 7006 (Implicit 'any')
// ============================================================================
// WHAT IT MEANT:
// You have `strict` or `noImplicitAny` enabled in your tsconfig. TypeScript 
// refuses to automatically guess the type of the `err` variable inside this 
// callback function, and it defaults to `any`, which your linter rejects.
//
// HOW WE SOLVED IT:
// We explicitly tell TypeScript that `err` is an `Error` object using `(err: Error)`. 
// This satisfies the strict type checking and gives us safe access to `err.message`.
connection.on('error', (err: Error) => {
  console.error('❌ Redis error:', err.message);
});
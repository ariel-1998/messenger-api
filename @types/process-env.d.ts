export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
      CORS_URL: string;
      JWT_SECRET: string;
      MONGO_URI: string;
    }
  }
}

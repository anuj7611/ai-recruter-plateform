export {};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: string;
        sessionId: string;
      };
    }
  }
}

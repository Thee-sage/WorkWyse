import cors from 'cors';

const corsOptions = {
  origin: 'http://localhost:3000', // Next.js default port
  credentials: true,
  optionsSuccessStatus: 200
};

export const corsMiddleware = cors(corsOptions); 
import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Membungkus handler async agar rejection-nya diteruskan ke middleware error.
 * Pola ini membuat penanganan error konsisten di semua route.
 */
export const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};

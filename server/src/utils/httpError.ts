/**
 * Error HTTP yang diketahui (4xx). Diterjemahkan ke respons JSON
 * oleh middleware errorHandler tanpa bocor sebagai stack trace.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

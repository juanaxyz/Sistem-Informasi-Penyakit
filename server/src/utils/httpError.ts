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

/** Error 404: resource/path yang diminta tidak ditemukan. */
export class NotFoundError extends HttpError {
  constructor(message = 'Data tidak ditemukan.') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/** Helper singkat untuk melempar NotFoundError. */
export const notFound = (message = 'Data tidak ditemukan.'): NotFoundError =>
  new NotFoundError(message);

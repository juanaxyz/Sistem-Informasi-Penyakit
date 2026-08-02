import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

/**
 * Test kontrak API (Vitest + Supertest).
 *
 * Fokus pada bentuk/structure respons dan status code — BUKAN nilai/isi data
 * (isi data dummy bisa berubah). Butuh database lokal aktif (lihat setupTests.ts
 * yang memuat DATABASE_URL dari server/.env).
 */
const app = createApp();

describe('GET /api/health', () => {
  it('menjawab 200 dengan status ok dan database up', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });
});

describe('GET /api/body-systems', () => {
  it('mengembalikan array dengan id, nama, slug', async () => {
    const res = await request(app).get('/api/body-systems');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(typeof item.id).toBe('number');
      expect(typeof item.nama).toBe('string');
      expect(typeof item.slug).toBe('string');
    }
  });
});

describe('GET /api/body-parts', () => {
  it('mengembalikan array dengan id, nama, slug, tampilan', async () => {
    const res = await request(app).get('/api/body-parts');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(typeof item.id).toBe('number');
      expect(typeof item.nama).toBe('string');
      expect(typeof item.slug).toBe('string');
      expect(typeof item.tampilan).toBe('string');
    }
  });
});

describe('GET /api/body-parts/filter?tampilan=depan', () => {
  it('mengembalikan hanya bagian tubuh dengan tampilan depan', async () => {
    const res = await request(app).get('/api/body-parts/filter?tampilan=depan');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(item.tampilan).toBe('depan');
    }
  });
});

describe('GET /api/diseases/by-body-part/19', () => {
  it('mengembalikan array (boleh kosong) dengan id dan nama', async () => {
    const res = await request(app).get('/api/diseases/by-body-part/19');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const item of res.body) {
      expect(typeof item.id).toBe('number');
      expect(typeof item.nama).toBe('string');
    }
  });
});

describe('GET /api/diseases/1', () => {
  it('mengembalikan detail dengan sistem_tubuh, konten, bagian_tubuh, referensi', async () => {
    const res = await request(app).get('/api/diseases/1');

    expect(res.status).toBe(200);
    expect(res.body).not.toBeNull();
    expect(res.body).toHaveProperty('sistem_tubuh');
    expect(res.body).toHaveProperty('konten');
    expect(res.body).toHaveProperty('bagian_tubuh');
    expect(res.body).toHaveProperty('referensi');
    expect(Array.isArray(res.body.konten)).toBe(true);
    expect(Array.isArray(res.body.bagian_tubuh)).toBe(true);
    expect(Array.isArray(res.body.referensi)).toBe(true);
  });
});

describe('GET /api/diseases/99999', () => {
  it('mengembalikan 200 dengan body null bila penyakit tidak ditemukan', async () => {
    const res = await request(app).get('/api/diseases/99999');

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

describe('GET /api/diseases/abc', () => {
  it('mengembalikan 400 dengan format error { error: { message } }', async () => {
    const res = await request(app).get('/api/diseases/abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });
});

describe('GET /api/search?q=asma', () => {
  it('mengembalikan array hasil pencarian', async () => {
    const res = await request(app).get('/api/search?q=asma');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/search tanpa parameter q', () => {
  it('mengembalikan 200 dengan array kosong', async () => {
    const res = await request(app).get('/api/search');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/tidak-ada (path tidak dikenal)', () => {
  it('mengembalikan 404 dengan format error { error: { message } }', async () => {
    const res = await request(app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });
});

describe('Alias legacy dihapus', () => {
  it('GET /api/bodyParts mengembalikan 404', async () => {
    const res = await request(app).get('/api/bodyParts');

    expect(res.status).toBe(404);
  });
});

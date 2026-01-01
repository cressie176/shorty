export default class TestClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth() {
    const response = await fetch(`${this.baseUrl}/__/health`);
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }

  async createRedirect(url: string) {
    const response = await fetch(`${this.baseUrl}/api/redirect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }

  async getRedirect(key: string) {
    const response = await fetch(`${this.baseUrl}/api/redirect/${key}`);
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }

  async followRedirect(key: string) {
    const response = await fetch(`${this.baseUrl}/r/${key}`, { redirect: 'manual' });
    const body = await response.text();
    return { status: response.status, headers: response.headers, body };
  }
}

export default class TestClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth() {
    const response = await fetch(`${this.baseUrl}/__/health`);
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }

  async post(path: string, data: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }
}

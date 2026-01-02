export default class TestClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth() {
    const response = await fetch(`${this.baseUrl}/__/health`);
    const body = (await response.json()) as any;
    return { status: response.status, body };
  }
}

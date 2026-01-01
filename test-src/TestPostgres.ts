import Postgres from '../src/infra/Postgres.js';

export default class TestPostgres extends Postgres {
  async nuke(): Promise<void> {
    await this.withClient((client) => client.query('SELECT nuke_data()'));
  }
}
